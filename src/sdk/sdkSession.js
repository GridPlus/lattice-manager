import { Client } from 'gridplus-sdk';
import { harden, fetchStateData, constants, getBtcVersion } from '../util/helpers';
import { default as StorageSession } from '../util/storageSession';
import worker from '../stateWorker.js';
import WebWorker from '../WebWorker';
const Buffer = require('buffer/').Buffer;
const ReactCrypto = require('gridplus-react-crypto').default;
const DEVICE_ADDR_SYNC_MS = 2000; // It takes roughly 2000 to sync a new address

class SDKSession {
  constructor(deviceID, stateUpdateHandler, name=null) {
    this.client = null;
    this.crypto = null;
    this.name = name || 'GridPlus Web Wallet'; // app name
    // Cached list of addresses, indexed by currency
    this.addresses = {};
    // Cached balances (in currency units), indexed by currency
    this.balances = {};
    this.usdValues = {};
    // Cached list of transactions, indexed by currency
    this.txs = {};
    // Cached list of UTXOs, indexed by currency
    this.utxos = {};
    // Cached list of unused addresses. These indicate the next available
    // address for each currency. Currently only contains a Bitcoin address
    this.firstUnusedAddresses = {};

    // Make use of localstorage to persist wallet data
    this.storageSession = null;
    // Save the device ID for the session
    this.deviceID = deviceID;
    // Handler to call when we get state updates
    this.stateUpdateHandler = stateUpdateHandler;
    // Web worker to sync blockchain data in the background
    this.worker = null;

    // When we sync state on BTC for the first time, also check on
    // the change addresses if we have captured those addresses previously.
    // This way we can simply check state on change rather than pulling new
    // addresses.
    this.hasCheckedBtcChange = false

    // The type of Bitcoin addresses the lattice is currently providing us
    this.btcAddrType = null;

    // Current page of results (transactions) for the wallet
    this.page = 1; // (1-indexed)
  
    // Go time
    this.getStorage();
  }

  disconnect() {
    this.client = null;
    this.saveStorage();
    this.storageSession = null;
    this.deviceId = null;
    this.worker.postMessage({ type: 'stop' });
    this.worker = null;
  }

  isConnected() {
    return this.client !== null;
  }

  isPaired() {
    return this.client.isPaired || false;
  }

  resetStateData() {
    this.balances = {};
    this.usdValues = {};
    this.txs = {};
    this.utxos = {};
    this.firstUnusedAddresses = {};
  }

  getBalance(currency, erc20Token=null) {
    if (currency === 'ETH' && erc20Token !== null)
      return this.balances[erc20Token] || 0;
    if (typeof this.balances[`${currency}_CHANGE`] === 'number')
      return this.balances[currency] + this.balances[`${currency}_CHANGE`];
    return this.balances[currency] || 0;
  }

  getUSDValue(currency) {
    if (typeof this.usdValues[`${currency}_CHANGE`] === 'number')
      return this.usdValues[currency] + this.usdValues[`${currency}_CHANGE`];
    return this.usdValues[currency] || 0;
  }

  getTxs(currency) {
    const base = this.txs[currency] || [];
    if (typeof this.txs[`${currency}_CHANGE`] === 'object') {
      // Need to also include transactions to/from change addresses.
      // Note that we need to cut out change receipt transactions, but we
      // do need to display transactions that invole spending from change.
      let allTxs = base.concat(this.txs[`${currency}_CHANGE`]).sort((a, b) => {
        return a.height < b.height ? 1 : -1
      });
      // Remove all transactions where the sender and recipient are both
      // our addresses (regular or change)
      const baseAddrs = this.addresses[currency];
      const changeAddrs = this.addresses[`${currency}_CHANGE`];
      JSON.parse(JSON.stringify(allTxs)).forEach((t, i) => {
        if (
          (baseAddrs.indexOf(t.to) > -1 || changeAddrs.indexOf(t.to) > -1) &&
          (baseAddrs.indexOf(t.from) > -1 || changeAddrs.indexOf(t.from) > -1)
        ) 
          allTxs = allTxs.splice(i, 1);
      })
      return allTxs;
    } else {
      return base;
    }
  }

  getUtxos(currency) {
    const base = this.utxos[currency] || [];
    if (typeof this.utxos[`${currency}_CHANGE`] === 'object')
      return base.concat(this.utxos[`${currency}_CHANGE`]).sort((a, b) => {
        return a.value > b.value ? 1 : -1;
      });
    return base || [];
  }

  getDisplayAddress(currency) {
    if (!this.addresses[currency]) 
      return null;
    
    switch (currency) {
      case 'BTC':
        // If we have set the next address to use, display that.
        // Otherwise, fallback on the first address.
        // In reality, we should never hit that fallback as this
        // function should not get called until after we have synced
        // at least a few addresses.
        if (this.firstUnusedAddresses[currency])
          return this.firstUnusedAddresses[currency];
        else
          return this.addresses[currency][0];
      case 'ETH':
        // We only ever use the first ETH address
        return this.addresses[currency][0];
      default:
        return null;
    }
  }

  getActiveWallet() {
    if (!this.client) return null;
    return this.client.getActiveWallet();
  }

  // Setup a web worker to periodically lookup state data
  setupWorker() {
    this.worker = new WebWorker(worker);
    this.worker.addEventListener('message', e => {
      switch (e.data.type) {
        case 'dataResp':
          // Got data; update state here and let the main component know
          this.fetchDataHandler(e.data.data);
          this.stateUpdateHandler();
          break;
        case 'error':
          // Error requesting data, report it to the main component.
          if (this.stateUpdateHandler)
            this.stateUpdateHandler({ err: e.data.data, currency: e.data.currency });
          break;
        case 'iterationDone':
          // Done looping through our set of currencies for the given iteration
          // Refresh wallets to make sure we are synced
          this.refreshWallets((err) => {
            this.stateUpdateHandler({err});
          })
          break;
        default:
          break;
      }
    })
    this.worker.postMessage({ type: 'setup', data: constants.GRIDPLUS_CLOUD_API })
    this.worker.postMessage({ type: 'setAddresses', data: this.addresses });
  }

  fetchDataHandler(data, usingChange=false) {
    let { currency } = data; // Will be adjusted if this is a change addresses request
    const { balance, transactions, firstUnused, lastUnused, utxos, erc20Balances, ethNonce } = data;
    let switchToChange = false;
    const changeCurrency = `${currency}_CHANGE`;
   
    // Handle a case where the user logged out while requesting addresses. This return
    // prevents an infinite loop of looking up state data for the same set of addresses
    if (!this.client) return;

    // BITCOIN SPECIFIC LOGIC:
    // Determine if we need to request additional addresses and/or state data:
    //---------
    let stillSyncingAddresses = false;
    // Determine if we need to fetch new addresses and are therefore still syncing
    // We need to fetch new BTC addresses up to the gap limit (20), meaning we need
    // GAP_LIMIT unused addresses in a row.
    if (currency === 'BTC') {
      // If we are told to switch to using change addresses, update the currency
      if (usingChange === true) {
        currency = changeCurrency;
        this.hasCheckedBtcChange = true; // Capture the first switch to change
      }
      
      // Determine if we need new addresses or if we are fully synced. This is based on the gap
      // limit (20 for regular addresses, 1 for change)
      const gapLimit = usingChange === true ? constants.BTC_CHANGE_GAP_LIMIT : constants.BTC_MAIN_GAP_LIMIT;

      // Sometimes if we switch wallet context, the addresses will get cleared out. Make sure they
      // are always in array format
      if (!this.addresses[currency])
        this.addresses[currency] = [];

      const needNewBtcAddresses = firstUnused < 0 || lastUnused < 0 ||
                                  (lastUnused === this.addresses[currency].length - 1 &&
                                  lastUnused - firstUnused < gapLimit - 1);
      // Save this
      this.firstUnusedAddresses[currency] = this.addresses[currency][firstUnused];
      if (needNewBtcAddresses === true) {
        // If we need more addresses of our currency (regular OR change), just continue on.
        stillSyncingAddresses = true;
        switchToChange = false;
      } else if (!this.addresses[changeCurrency]) {
        // If we're up to speed with the regular ones but we don't have any change addresses,
        // we need to switch to those.
        stillSyncingAddresses = true;
        switchToChange = true;
      } else if (!this.hasCheckedBtcChange) {
        // If we haven't checked change and we *do* have addresses, do the switch and update
        // currency to change.
        switchToChange = true;
      } else {
        switchToChange = false;
      }
    } else if (currency === 'ETH') {
      // Record nonce
      if (ethNonce !== null)
        this.ethNonce = ethNonce;
      // Record the ERC20 balances
      erc20Balances.forEach((e) => {
        this.balances[e.contractAddress] = e.balance;
      })
    }
    //---------

    // Dispatch updated data for the UI
    this.balances[currency] = balance.value || 0;
    this.usdValues[currency] = balance.dollarAmount || 0;
    this.txs[currency] = transactions || [];
    this.utxos[currency] = utxos || [];
    // Tell the main component if we are done syncing. Note that this also captures the case
    // where we are switching to syncing change addresses/data
    const stillSyncingIndicator = stillSyncingAddresses === true || switchToChange === true;
    this.stateUpdateHandler({ stillSyncingAddresses: stillSyncingIndicator });

    // Set params for continuation calls
    let useChange = false;
    let requestCurrency = currency;
    if (switchToChange === true) {
      useChange = true;
      requestCurrency = changeCurrency;
    }
    // Continue syncing data and/or fetching addresses
    if (stillSyncingAddresses) {
      // If we are still syncing, get the new addresses we need
      setTimeout(() => {
        // Request the addresses -- the device needs ~2s per address to recover from the last one
        // due to the fact that it may start caching new addresses based on our requests.
        // Note that we are using 2s as a timeout here, but we will run into "Device Busy" errors
        // if the device starts syncing a batch of new addresses (as opposed to one more).
        // We will capture this in the callback.
        const fetchWrapper = () => {this.fetchData(requestCurrency, null, useChange)};
        this.loadAddresses(requestCurrency, fetchWrapper, true);
      }, DEVICE_ADDR_SYNC_MS);
    } else if (switchToChange === true) {
      // If we don't necessarily need new addresses but we do need to check on
      // change addresses, call `fetchData` directly (i.e. don't call `loadAddresses`)
      setTimeout(() => {
        this.fetchData(requestCurrency, null, useChange);
      }, DEVICE_ADDR_SYNC_MS);
    }
  }

  fetchData(currency, cb=()=>{}, switchToChange=false) {
    fetchStateData(currency, this.addresses, this.page, (err, data) => {
      if (err) 
        return cb(err);
      if (data)
        this.fetchDataHandler(data, switchToChange);
      else
        this.stateUpdateHandler({ stillSyncingAddresses: false });
      if (cb) return cb(null);
    })
  }

  setPage(newPage=1) {
    this.page = newPage;
    this.worker.postMessage({ type: 'setPage', data: this.page });
  }

  getPage() {
    return this.page;
  }

  // Load a set of addresses based on the currency and also based on the current
  // list of addresses we hold. Note that we are operating under a specific walletUID.
  // The walletUID maps 1:1 to a wallet seed and therefore the addresses of any provided
  // indices will ALWAYS be the same. Thus, we don't need to re-request them unless
  // we lose localStorage, which is also captured via a StorageSession.
  // Therefore, we can always assume that the addresses we have are "immutable" given
  // current state params (walletUID and StorageSession).
  loadAddresses(currency, cb, force=false) {
    if (!this.client) return cb('No client connected');
    const opts = {};
    // Get the current address list for this currency
    let currentAddresses = this.addresses[currency] || [];
    if (!currentAddresses) currentAddresses = [];
    const nextIdx = currentAddresses.length;
    switch(currency) {
      case 'BTC':
        // Skip the initial sync if we have GAP_LIMIT addresses -- we will assume we have
        // already synced and this function will get called if we discover <20 unused addresses
        // (via `fetchDataHandler`)
        if (force !== true && nextIdx >= constants.BTC_MAIN_GAP_LIMIT) return cb(null);
        opts.startPath = [ harden(44), constants.BTC_COIN, harden(0), 0, nextIdx ];
        opts.n = nextIdx >= constants.BTC_MAIN_GAP_LIMIT ? 1 : constants.BTC_ADDR_BLOCK_LEN;
        break;
      case 'BTC_CHANGE':
        // Skip the initial sync if we have at least one change address (GAP_LIMIT=1)
        if (force !== true && nextIdx >= constants.BTC_CHANGE_GAP_LIMIT) return cb(null);
        opts.startPath = [ harden(44), constants.BTC_COIN, harden(0), 1, nextIdx ];
        opts.n = nextIdx >= constants.BTC_CHANGE_GAP_LIMIT ? 1 : constants.BTC_CHANGE_GAP_LIMIT;
        break;
      case 'ETH':
        // Do not load addresses if we already have the first ETH one.
        // We will only ever use one ETH address, so callback success here.
        if (nextIdx > 0) return cb(null);
        // If we don't have any addresses here, let's get the first one
        opts.startPath = [ harden(44), harden(60), harden(0), 0, nextIdx ];
        opts.n = 1;
        break;
      default:
        return cb('Invalid currency to request addresses');
    }
    this.client.getAddresses(opts, (err, addresses) => {
      // Catch an error, but if the device is busy it probably means it is currently
      // caching a batch of new addresses. Continue the loop through this request until
      // it hits.
      if (err && err !== 'Device Busy') {
        setTimeout(() => {
          return cb(err);
        }, 2000);
      } else {
        // To avoid concurrency problems on an initial sync, we need to wait
        // for the device to refresh addresses before completing the callback
        setTimeout(() => {
          if (err === 'Device Busy') {
            return this.loadAddresses(currency, cb, force);
          } else {
            // Save the addresses to memory and also update them in localStorage
            // Note that we do need to track index here
            this.addresses[currency] = currentAddresses.concat(addresses);
            this.saveStorage();
            this.worker.postMessage({ type: 'setAddresses', data: this.addresses });
            return cb(null);
          }
        }, opts.n * DEVICE_ADDR_SYNC_MS);
      }
    })
  }

  // Prepare addresses for caching in localStorage
  dryAddresses() {
    const driedAddrs = {
      ETH: this.addresses.ETH || [],
    };
    const hasBTCAddrs = this.addresses.BTC && this.addresses.BTC.length > 0;
    const hasBTCChangeAddrs = this.addresses.BTC_CHANGE && this.addresses.BTC_CHANGE.length > 0;
    if (this.btcAddrType !== null && hasBTCAddrs) {
      driedAddrs.BTC = {};
      driedAddrs.BTC[this.btcAddrType] = this.addresses.BTC || [];
    }
    if (this.btcAddrType !== null && hasBTCChangeAddrs) {
      driedAddrs.BTC_CHANGE = {};
      driedAddrs.BTC_CHANGE[this.btcAddrType] = this.addresses.BTC_CHANGE || [];
    }
    return driedAddrs;
  }

  // Pull addresses out of cached localStorage data
  rehydrateAddresses(allAddrs={}) {
    const rehydratedAddrs = {};
    if (allAddrs.ETH)
      rehydratedAddrs.ETH = allAddrs.ETH;
    if (this.btcAddrType !== null && allAddrs.BTC) {
      rehydratedAddrs.BTC = allAddrs.BTC[this.btcAddrType];
    }
    if (this.btcAddrType !== null && allAddrs.BTC_CHANGE) {
      rehydratedAddrs.BTC_CHANGE = allAddrs.BTC_CHANGE[this.btcAddrType];
    }
    this.addresses = rehydratedAddrs;
  }

  saveStorage() {
    // This function should never be called without a deviceID 
    // or StorageSession
    if (!this.deviceID || !this.storageSession) return;

    // Package data and save it
    // NOTE: We are only storing addresses at this point, as
    // the blockchain state needs to be up-to-date and is therefore
    // not very useful to store.
    const walletData = {
      addresses: this.dryAddresses(),
    };
    const activeWallet = this.client ? this.client.getActiveWallet() : null;
    if (this.client && activeWallet !== null) {
      const wallet_uid = activeWallet.uid.toString('hex');
      this.storageSession.save(this.deviceID, wallet_uid, walletData);
    }
  }

  getStorage() {
    // Create a storage session only if we have a deviceID and don't
    // have a current storage session
    if (this.deviceID && !this.storageSession)
      this.storageSession = new StorageSession(this.deviceID);
    if (this.client && this.worker) {
      // If we have a client and if it has a non-zero active wallet UID,
      // lookup the addresses corresponding to that wallet UID in storage.
      const activeWallet = this.getActiveWallet();
      if (activeWallet === null) {
        // No active wallet -- reset addresses and tell the worker to stop looking
        // for updates until we get an active wallet
        this.addresses = {};
        this.worker.postMessage({ type: 'setAddresses', data: this.addresses });
        this.worker.postMessage({ type: 'stop' });
      } else {
        const uid = activeWallet.uid.toString('hex')
        // Rehydrate the data
        const walletData = this.storageSession.getWalletData(this.deviceID, uid) || {};
        this.rehydrateAddresses(walletData.addresses);
        this.worker.postMessage({ type: 'setAddresses', data: this.addresses });
      }
    }
  }

  // Request the first BTC address so we can know what data to rehydrate
  loadBtcAddrType(cb) {
    const opts = {
      startPath: [ harden(44), constants.BTC_COIN, harden(0), 0, 0 ],
      n: 1
    };
    this.client.getAddresses(opts, (err, addresses) => {
      if (err) return cb(err);
      const version = getBtcVersion(addresses[0]);
      if (version === null) return cb('Failed to load addresses from the Lattice');
      this.btcAddrType = version;
      this.getStorage();
      return cb(null);
    })
  }

  connect(deviceID, pw, cb, tmpTimeout=constants.SHORT_TIMEOUT) {
    // Derive a keypair from the deviceID and password
    // This key doesn't hold any coins and only allows this app to make
    // requests to a particular device. Nevertheless, the user should
    // enter a reasonably strong password to prevent unwanted requests
    // from nefarious actors.
    const key = this._genPrivKey(deviceID, pw, this.name);
    // If no client exists in this session, create a new one and
    // attach it.
    const client = new Client({ 
      name: this.name,
      crypto: this.crypto,
      privKey: key,
      baseUrl: constants.BASE_SIGNING_URL,
      timeout: tmpTimeout, // Artificially short timeout for simply locating the Lattice
    })
    client.connect(deviceID, (err) => {
      if (err) return cb(err);
      // Update the timeout to a longer one for future async requests
      client.timeout = constants.ASYNC_SDK_TIMEOUT;
      this.client = client;
      // Setup a new storage session if these are new credentials.
      // (This call will be bypassed if the credentials are already saved
      // in localStorage because getStorage is also called in the constructor)
      this.deviceID = deviceID;
      this.setupWorker();
      this.getStorage();
      return cb(null, client.isPaired);
    });
  }

  refreshWallets(cb) {
    if (this.client) {
      const prevWallet = JSON.stringify(this.client.getActiveWallet());
      this.client.connect(this.deviceID, (err) => {
        // If we lost connection, the user most likely removed the pairing and will need to repair
        if (false === this.client.isPaired)
          return cb(constants.LOST_PAIRING_ERR);
        if (err)
          return cb(err);
        // If we pulled a new active wallet, reset balances + transactions
        // so we can reload a new set.
        const newWallet = JSON.stringify(this.client.getActiveWallet());
        if (newWallet !== prevWallet)
          this.resetStateData();
        // Update storage. This will remap to a new localStorage key if the wallet UID
        // changed. If we didn't get an active wallet, it will just clear out the addresses
        this.getStorage();
        return cb(null);
      })
    } else {
      return cb('Lost connection to Lattice. Please refresh.');
    }
  }

  pair(secret, cb) {
    this.client.pair(secret, cb);
  }

  sign(req, cb) {
    // Get the tx payload to broadcast
    this.client.sign(req, (err, res) => {
      if (err) {
        console.error('Signing error:', err);
        return cb("Lattice failed to sign transaction. If you're sure it's correct, please try again.");
      }

      // Broadcast
      const url = `${constants.GRIDPLUS_CLOUD_API}/v2/accounts/broadcast`;
      // Req should have the serialized payload WITH signature in the `tx` param
      const body = { currency: req.currency, hex: res.tx };
      const data = {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      }
      // console.log('broadcasting', body)
      fetch(url, data)
      .then((response) => {
        return response.json()
      })
      .then((resp) => {
          if (resp.error || resp.type === "RPCError") {
            console.error('Broadcasting error in response: ', resp.error);
            return cb("Error broadcasting transaction. Please wait a bit and try again.");
          }
          // Return the transaction hash
          return cb(null, resp.data);
      })
      .catch((err) => {
          console.error('Broadcast error:', err);
          return cb("Error broadcasting transaction. Please wait a bit and try again.");
      });
    })
  }

  _genPrivKey(deviceID, pw, name) {
    const key = Buffer.concat([
      Buffer.from(pw), 
      Buffer.from(deviceID),
      Buffer.from(name),
    ])
    // Create a new instance of ReactCrypto using the key as entropy
    this.crypto = new ReactCrypto(key);
    return this.crypto.createHash('sha256').update(key).digest();
  }

}

export default SDKSession