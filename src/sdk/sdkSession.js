import { Client } from 'gridplus-sdk';
import { harden, constants, getBtcPurpose, fetchBtcTxs, fetchBtcUtxos, addUniqueItems } from '../util/helpers';
import { default as StorageSession } from '../util/storageSession';
const Buffer = require('buffer/').Buffer;
const ReactCrypto = require('gridplus-react-crypto').default;

class SDKSession {
  constructor(deviceID, stateUpdateHandler, name=null, opts={}) {
    this.client = null;
    this.crypto = null;
    this.name = name || constants.DEFAULT_APP_NAME; // app name
    // Make use of localstorage to persist wallet data
    this.storageSession = null;
    // Save the device ID for the session
    this.deviceID = deviceID;
    // Handler to call when we get state updates
    this.stateUpdateHandler = stateUpdateHandler;

    // Current page of results (transactions) for the wallet
    this.page = 1; // (1-indexed)

    // Configurable settings
    this.baseUrl = opts.customEndpoint ? opts.customEndpoint : constants.BASE_SIGNING_URL;

    // BTC wallet data
    this.addresses = {};  // Contains BTC and BTC_CHANGE addresses
    this.btcTxs = [];     // Contains all txs for all addresses
    this.btcUtxos = [];   // Contains all utxos for all addresses

    // Go time
    this.getStorage();
  }

  disconnect() {
    this.client = null;
    this.saveStorage();
    this.storageSession = null;
    this.deviceId = null;
  }

  isConnected() {
    return this.client !== null;
  }

  isPaired() {
    return this.client.isPaired || false;
  }

  resetStateData() {
    this.addresses = {};
    this.btcTxs = [];
    this.btcUtxos = [];
  }
  
  getDisplayAddress(currency) {
    switch (currency) {
      case 'BTC':
        // If we have set the next address to use, display that.
        // Otherwise, fallback on the first address.
        const lastUsed = this._getLastUsedBtcAddrIdx()
        if (lastUsed > -1)
          return lastUsed + 1;
        else if (this.addresses.BTC && this.addresses.BTC.length > 0)
          return this.addresses.BTC[0];
        else
          return null;
      default:
        return null;
    }
  }

  getActiveWallet() {
    if (!this.client) return null;
    return this.client.getActiveWallet();
  }

  setPage(newPage=1) {
    this.page = newPage;
  }

  getPage() {
    return this.page;
  }

  // Prepare addresses for caching in localStorage
  dryAddresses() {
    const driedAddrs = {};
    const hasBTCAddrs = this.addresses.BTC && this.addresses.BTC.length > 0;
    const hasBTCChangeAddrs = this.addresses.BTC_CHANGE && this.addresses.BTC_CHANGE.length > 0;
    const BTC_PURPOSE = getBtcPurpose();
    if (hasBTCAddrs) {
      driedAddrs.BTC = {};
      driedAddrs.BTC[BTC_PURPOSE] = this.addresses.BTC || [];
    }
    if (hasBTCChangeAddrs) {
      driedAddrs.BTC_CHANGE = {};
      driedAddrs.BTC_CHANGE[BTC_PURPOSE] = this.addresses.BTC_CHANGE || [];
    }
    return driedAddrs;
  }

  // Pull addresses out of cached localStorage data
  rehydrateAddresses(allAddrs={}) {
    const rehydratedAddrs = {};
    const BTC_PURPOSE = getBtcPurpose();
    if (allAddrs.BTC) {
      rehydratedAddrs.BTC = allAddrs.BTC[BTC_PURPOSE];
    }
    if (allAddrs.BTC_CHANGE) {
      rehydratedAddrs.BTC_CHANGE = allAddrs.BTC_CHANGE[BTC_PURPOSE];
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
    if (this.client) {
      // If we have a client and if it has a non-zero active wallet UID,
      // lookup the addresses corresponding to that wallet UID in storage.
      const activeWallet = this.getActiveWallet();
      if (activeWallet === null) {
        // No active wallet -- reset addresses
        this.addresses = {};
      } else {
        const uid = activeWallet.uid.toString('hex')
        // Rehydrate the data
        const walletData = this.storageSession.getWalletData(this.deviceID, uid) || {};
        this.rehydrateAddresses(walletData.addresses);
      }
    }
  }

  _tryConnect(deviceID, pw, cb, _triedLocal=false) {
    let baseUrl = this.baseUrl;
    let tmpTimeout = constants.SHORT_TIMEOUT; // Artificially short timeout just for connecting
    if (_triedLocal === false) {
      baseUrl = `http://lattice-${deviceID}.local:8080`
      tmpTimeout = 5000 // Shorten the timeout even more since we should discover quickly if device is on LAN
    }
    // Derive a keypair from the deviceID and password
    // This key doesn't hold any coins and only allows this app to make
    // requests to a particular device. Nevertheless, the user should
    // enter a reasonably strong password to prevent unwanted requests
    // from nefarious actors.
    const key = this._genPrivKey(deviceID, pw, this.name);
    // If no client exists in this session, create a new one and
    // attach it.
    let client;
    try {
      client = new Client({ 
        name: this.name,
        crypto: this.crypto,
        privKey: key,
        baseUrl,
        timeout: tmpTimeout, // Artificially short timeout for simply locating the Lattice
      })
    } catch (err) {
      return cb(err.toString());
    }
    client.connect(deviceID, (err) => {
      if (err) {
        if (_triedLocal === false) {
          console.warn('Failed to connect to Lattice over LAN. Falling back to cloud routing.')
          return this._tryConnect(deviceID, pw, cb, true); 
        } else {
          console.error('Failed to connect via cloud routing.')
          return cb(err);
        }
      } else if (_triedLocal === false) {
        console.log('Successfully connected to Lattice over LAN.')
      }
      // Update the timeout to a longer one for future async requests
      client.timeout = constants.ASYNC_SDK_TIMEOUT;
      this.client = client;
      // Setup a new storage session if these are new credentials.
      // (This call will be bypassed if the credentials are already saved
      // in localStorage because getStorage is also called in the constructor)
      this.deviceID = deviceID;
      this.getStorage();
      return cb(null, client.isPaired);
    });
  }

  connect(deviceID, pw, cb) {
    // return this._tryConnect(deviceID, pw, cb);
    return this._tryConnect(deviceID, pw, cb, true); // temporarily disable local connect
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

  addAbiDefs(defs, cb) {
    this.client.addAbiDefs(defs, cb);
  }

  addPermissionV0(req, cb) {
    this.client.addPermissionV0(req, cb);
  }

  pair(secret, cb) {
    this.client.pair(secret, cb);
  }

  sign(req, cb) {
    // Get the tx payload to broadcast
    this.client.sign(req, (err, res) => {
      if (err) {
        return cb(err);
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

  //----------------------------------------------------
  // NEW STUFF - REWRITING ADDRESS/DATA FETCHING FOR BTC WALLET
  //----------------------------------------------------

  // Fetch necessary addresses based on state data. We need to fetch addresses
  // for both BTC and BTC_CHANGE such that we have fetched GAP_LIMIT past the last
  // used address. An address is "used" if it has at least one transaction associated.
  // This function will automatically fetch both BTC and BTC_CHANGE addresses up to
  // the associated GAP_LIMITs and updates state internally.
  // Returns a callback containing params (error, numFetched), where `numFetched` is
  // the total number of *new* addresses we fetched. If this number is >0, it signifies
  // we should re-fetch transaction data for our new set of addresses.
  getBtcAddresses(cb, isChange=false, totalFetched=0) {
    const lastUsedIdx = this._getLastUsedBtcAddrIdx(isChange);
    const currentAddrs = (isChange ? this.addresses.BTC_CHANGE : this.addresses.BTC) || [];
    const GAP_LIMIT = isChange ? 1 : 20;
    const targetIdx = lastUsedIdx + 1 + GAP_LIMIT;
    const maxToFetch = targetIdx - currentAddrs.length;
    const nToFetch = Math.min(constants.BTC_ADDR_BLOCK_LEN, maxToFetch)
    if (nToFetch > 0) {
      // If we have closed our gap limit we need to get more addresses
      const changeIdx = isChange ? 1 : 0;
      const opts = {
        startPath: [ getBtcPurpose(), constants.BTC_COIN, harden(0), changeIdx, currentAddrs.length ],
        n: nToFetch,
        skipCache: true,
      }
      this._getAddresses(opts, (err, addresses) => {
        if (err)
          return cb(err);
        // Track the number of new addresses we fetched
        totalFetched += nToFetch;
        // Save the addresses to memory and also update them in localStorage
        // Note that we do need to track index here
        if (isChange) {
          this.addresses.BTC_CHANGE = currentAddrs.concat(addresses);
        } else {
          this.addresses.BTC = currentAddrs.concat(addresses);
        }
        this.saveStorage();
        // If we need to fetch more, recurse
        if (maxToFetch > nToFetch) {
          this.getBtcAddresses(cb, isChange, totalFetched);
        } else if (!isChange) {
          // If we are done fetching main BTC addresses, switch to the change path
          this.getBtcAddresses(cb, true, totalFetched);
        } else {
          cb(null);
        }
      })
    } else if (!isChange) {
      // If we are done fetching main BTC addresses, switch to the change path
      this.getBtcAddresses(cb, true, totalFetched);
    } else {
      // Nothing to fetch
      cb(null, totalFetched);
    }
  }

  // Fetch transactions and UTXOs for all known BTC addresses (including change)
  // Calls to appropriate Bitcoin data provider and updates state internally.
  // Returns a callback with params (error)
  getBtcData(cb, isChange=false) {
    let addrs = (isChange ? this.addresses.BTC_CHANGE : this.addresses.BTC) || [];
    if (addrs.length > 2)
      addrs = addrs.slice(0, 2)
    console.log('fetching txs')
    fetchBtcTxs(addrs, (err, txs) => {
      console.log('got txs', err, txs)
      if (err)
        return cb(err);
      else if (!txs)
        return cb('Failed to fetch transactions');
      this.btcTxs = addUniqueItems(txs, this.btcTxs)
      this._processBtcTxs();
      fetchBtcUtxos(addrs, (err, utxos) => {
        console.log('got utxos', utxos)
        if (err)
          return cb(err)
        this.btcUtxos = addUniqueItems(utxos, this.btcUtxos)
        console.log('got utxos', utxos)
        if (!isChange) {
          // Once we get data for our BTC addresses, switch to change
          this.getBtcData(cb, true);
        } else {
          cb(null)
        }
      })
    })
  }

  // Generic caller to SDK getAddress route with retry mechanism
  _getAddresses(opts, cb) {
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
        if (err === 'Device Busy') {
          return this._getAddresses(opts, cb)
        } else {
          return cb(null, addresses);
        }
      }
    })
  }

  // Get the highest index address that has been used for either BTC or BTC_CHANGE
  _getLastUsedBtcAddrIdx(change=false) {
    const coin = change ? 'BTC_CHANGE' : 'BTC';
    const addrs = this.addresses[coin] || [];
    const txs = this.btcTxs || [];
    let lastUsed = -1;
    for (let i = 0; i < txs.length; i++) {
      let maxUsed = lastUsed;
      txs[i].inputs.forEach((input) => {
        if (addrs.indexOf(input.spender) > maxUsed)
          maxUsed = addrs.indexOf(input.spender);
      })
      txs[i].outputs.forEach((output) => {
        if (addrs.indexOf(output.spender) > maxUsed)
          maxUsed = addrs.indexOf(output.spender);
      })
      if (maxUsed > lastUsed)
        lastUsed = maxUsed;
    }
    return lastUsed;
  }

  // Loop through known txs, determining value and recipient
  // based on known addresses.
  // Recipient should be the first address
  // If the recipient is one of our addresses, the transaction is inbound
  // If the transaction is inbound, value is SUM(outputs to our addresses)
  // If the transaction is outbound, value is SUM(inputs) - SUM(outputs to our addresses)
  _processBtcTxs() {
    const allAddrs = this.addresses.BTC.concat(this.addresses.BTC_CHANGE);
    const processedTxs = [];
    this.btcTxs.forEach((tx) => {
      tx.recipient = tx.outputs[0].addr;
      tx.incoming = allAddrs.indexOf(tx.recipient) > -1;
      tx.value = 0;
      if (allAddrs.indexOf(tx.recipient) === -1) {
        // Outbound
        tx.inputs.forEach((input) => {
          tx.value += input.value;
        })
        tx.outputs.forEach((output) => {
          if (allAddrs.indexOf(output.addr) === -1)
            tx.value += output.value;
        })
      } else {
        // Inbound
        tx.outputs.forEach((output) => {
          if (allAddrs.indexOf(output.addr) > -1)
            tx.value += output.value;
        })
      }
      processedTxs.push(tx);
    })
    console.log('processed', processedTxs)
    const sortedTxs = processedTxs.sort((a, b) => { return a.timestamp - b.timestamp })
    this.btcTxs = sortedTxs;
  }
}

export default SDKSession