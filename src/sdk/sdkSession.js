import { Client } from 'gridplus-sdk';
import { harden, fetchStateData, constants } from '../util/helpers';
import { default as StorageSession } from '../util/storageSession';
import worker from '../stateWorker.js';
import WebWorker from '../WebWorker';
const Buffer = require('buffer/').Buffer;
const ReactCrypto = require('gridplus-react-crypto').default;

class SDKSession {
  constructor(deviceID, stateUpdateHandler) {
    this.client = null;
    this.crypto = null;
    // Cached list of addresses, indexed by currency
    this.addresses = {};
    // Cached balances (in currency units), indexed by currency
    this.balances = {};
    this.usdValues = {};
    // Cached list of transactions, indexed by currency
    this.txs = {};
    // Make use of localstorage to persist wallet data
    this.storageSession = null;
    // Save the device ID for the session
    this.deviceID = deviceID;
    // Handler to call when we get state updates
    this.stateUpdateHandler = stateUpdateHandler;
    // Web worker to sync blockchain data in the background
    this.worker = null;
    this.updateStorage();

    // Use this flag to determine if we need to check on change addrsses.
    // Without this flag, we are not aware of the `BTC_CHANGE` address
    // set. This will only get updated once.
    this.hasSyncedBtcChange = false;
    
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

  getBalance(currency) {
    return this.balances[currency] || 0;
  }

  getUSDValue(currency) {
    return this.usdValues[currency] || 0;
  }

  getTxs(currency) {
    return this.txs[currency] || [];
  }

  getAddresses(currency) {
    return this.addresses[currency] || [];
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
          this.refreshWallets(() => {
            this.stateUpdateHandler();
          })
          break;
        default:
          break;
      }
    })
    this.worker.postMessage({ type: 'setup', data: constants.GRIDPLUS_CLOUD_API })
    this.worker.postMessage({ type: 'setAddresses', data: this.addresses });
  }

  fetchDataHandler(data, isChange=false) {
    let { currency } = data;
    const { balance, transactions, firstUnused, lastUnused } = data;
   
    // Handle a case where the user logged out while requesting addresses. This return
    // prevents an infinite loop of looking up state data for the same set of addresses
    if (!this.client) return;

    // BITCOIN SPECIFIC LOGIC:
    let stillSyncingAddresses = false;
    let fullCurrency = currency; // Will be adjusted if this is a change addresses request
    //---------
    // Determine if we need to fetch new addresses and are therefore still syncing
    // We need to fetch new BTC addresses up to the gap limit (20), meaning we need
    // GAP_LIMIT unused addresses in a row.
    if (currency === 'BTC') {
      // Account for change addresses
      if (isChange === true) {
        // Tell `loadAddresses` we are looking for change addresses
        fullCurrency = `${currency}_CHANGE`;
        // Ensure we don't enter this function again for change addresses unless we bump into the change gapLimit
        this.hasSyncedBtcChange = true;
      }
      
      // Determine if we need new addresses or if we are fully synced. This is based on the gap
      // limit (20 for regular addresses, 1 for change)
      const gapLimit = isChange === true ? constants.BTC_CHANGE_GAP_LIMIT : constants.BTC_MAIN_GAP_LIMIT;
      const needNewBtcAddresses = lastUnused === this.addresses[currency].length - 1 &&
                                  lastUnused - firstUnused < gapLimit - 1;
      
      // Finally, cpature all of this in a condition that determines if we need to sync new addresses
      if (needNewBtcAddresses === true) {
        // If we have encroached on the gap limit, continue with regular addresses
        stillSyncingAddresses = true;
      } else if (!this.hasSyncedBtcChange) {
        // If we no longer need new regular addresses and we haven't checked on change addresses this session,
        // go ahead 
        // If we have not yet synced change addresses in this session, let's do that now.
        stillSyncingAddresses = true;
        fullCurrency = `${currency}_CHANGE`;
        isChange = true;
      }
    }
    console.log('fetchDataHandler: stillSyncing:', stillSyncingAddresses, 'fullCurrency', fullCurrency, 'isChange', isChange);
    console.log('this.addresses', this.addresses)
    //---------

    // Dispatch updated data for the UI
    this.balances[currency] = balance.value;
    this.usdValues[currency] = balance.dollarAmount;
    this.txs[currency ] = transactions;
    this.stateUpdateHandler({ stillSyncingAddresses });

    // If we are still syncing, get the new addresses we need
    if (stillSyncingAddresses) {
      setTimeout(() => {
        // Request the addresses -- the device needs ~2s per address to recover from the last one
        // due to the fact that it may start caching new addresses based on our requests.
        const fetchWrapper = () => {this.fetchData(currency, null, isChange)};
        this.loadAddresses(fullCurrency, fetchWrapper, true);
      }, constants.BTC_ADDR_BLOCK_LEN * 2000)
    }
  }

  fetchData(currency, cb=null, isChange=false) {
    fetchStateData(currency, this.addresses, (err, data) => {
      if (err) return cb(err);
      this.fetchDataHandler(data, isChange);
      if (cb) return cb(null);
    })
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
        opts.n = constants.BTC_ADDR_BLOCK_LEN;
        break;
      case 'BTC_CHANGE':
        // Skip the initial sync if we have at least one change address (GAP_LIMIT=1)
        if (force !== true && nextIdx >= constants.BTC_CHANGE_GAP_LIMIT) return cb(null);
        opts.startPath = [ harden(44), constants.BTC_COIN, harden(0), 1, nextIdx ];
        opts.n = constants.BTC_CHANGE_GAP_LIMIT;
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
      if (err) return cb(err);
      // Save the addresses to memory and also update them in localStorage
      // Note that we do need to track index here
      this.addresses[currency] = currentAddresses.concat(addresses);
      this.saveStorage();
      return cb(null);
    })
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
      addresses: this.addresses,
    };
    const activeWallet = this.client ? this.client.getActiveWallet() : null;
    if (this.client && activeWallet !== null) {
      const wallet_uid = activeWallet.uid.toString('hex');
      this.storageSession.save(this.deviceID, wallet_uid, walletData);
    }
  }

  updateStorage() {
    // Create a storage session only if we have a deviceID and don't
    // have a current storage session
    if (this.deviceID && !this.storageSession)
      this.storageSession = new StorageSession(this.deviceID);
    if (this.client) {
      // If we have a client and if it has a non-zero active wallet UID,
      // lookup the addresses corresponding to that wallet UID in storage.
      const activeWallet = this.getActiveWallet();
      if (activeWallet === null) {
        // No active wallet -- reset addresses and tell the worker to stop looking
        // for updates until we get an active wallet
        this.addresses = {};
        this.worker.postMessage({ type: 'setAddresses', data: this.addresses });
      } else {
        const uid = activeWallet.uid.toString('hex')
        // Rehydrate the data
        const walletData = this.storageSession.getWalletData(this.deviceID, uid) || {};
        this.addresses = walletData.addresses || {};
      }
    }
  }

  connect(deviceID, pw, cb, initialTimeout=constants.ASYNC_SDK_TIMEOUT) {
    // Derive a keypair from the deviceID and password
    // This key doesn't hold any coins and only allows this app to make
    // requests to a particular device. Nevertheless, the user should
    // enter a reasonably strong password to prevent unwanted requests
    // from nefarious actors.
    const key = this._genPrivKey(deviceID, pw);
    // If no client exists in this session, create a new one and
    // attach it.
    const client = new Client({ 
      name: 'GridPlus Web Wallet',
      crypto: this.crypto,
      privKey: key,
      baseUrl: 'https://signing.staging-gridpl.us',
      timeout: initialTimeout, // Artificially short timeout for simply locating the Lattice
    })
    client.connect(deviceID, (err) => {
      if (err) return cb(err);
      // Update the timeout to a longer one for future async requests
      client.timeout = constants.ASYNC_SDK_TIMEOUT;
      this.client = client;
      // Setup a new storage session if these are new credentials.
      // (This call will be bypassed if the credentials are already saved
      // in localStorage because updateStorage is also called in the constructor)
      this.deviceID = deviceID;
      this.updateStorage();
      this.setupWorker();
      return cb(null, client.isPaired);
    });
  }

  refreshWallets(cb) {
    if (this.client)
      this.client.refreshWallets((err) => {
        // Update storage. This will remap to a new localStorage key if the wallet UID
        // changed. If we didn't get an active wallet, it will just clear out the addresses
        this.updateStorage();
        cb(err);
      })
  }

  pair(secret, cb) {
    this.client.pair(secret, cb);
  }

  _genPrivKey(deviceID, pw) {
    const key = Buffer.concat([Buffer.from(pw), Buffer.from(deviceID)])
    // Create a new instance of ReactCrypto using the key as entropy
    this.crypto = new ReactCrypto(key);
    return this.crypto.createHash('sha256').update(key).digest();
  }

}

export default SDKSession