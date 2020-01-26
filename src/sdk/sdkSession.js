import { Client } from 'gridplus-sdk';
import { CONSTANTS } from '../constants';
import { harden } from '../util/helpers';
import { default as StorageSession } from '../util/storageSession';
const Buffer = require('buffer/').Buffer;
const ReactCrypto = require('gridplus-react-crypto').default;
const EMPTY_WALLET_UID = Buffer.alloc(32);

class SDKSession {
  constructor() {
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
    this.deviceID = null;
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

  fetchData(currency, cb) {
    const data = {
        method: 'POST',
        body: JSON.stringify([{
          currency,
          addresses: this.getAddresses(currency),
        }]),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    }
    const url = `${CONSTANTS.GRIDPLUS_CLOUD_API}/v2/accounts/get-data`
    fetch(url, data)
    .then((response) => response.json())
    .then((r) => {
      this.balances[currency] = r.data[0].balance.value;
      this.usdValues[currency] = r.data[0].balance.dollarAmount;
      this.txs[currency ] = r.data[0].transactions;
      return cb(null);
    })
    .catch((err) => {
      return cb(err);
    });
  }


  // Load a set of addresses based on the currency and also based on the current
  // list of addresses we hold. Note that we are operating under a specific walletUID.
  // The walletUID maps 1:1 to a wallet seed and therefore the addresses of any provided
  // indices will ALWAYS be the same. Thus, we don't need to re-request them unless
  // we lose localStorage, which is also captured via a StorageSession.
  // Therefore, we can always assume that the addresses we have are "immutable" given
  // current state params (walletUID and StorageSession).
  loadAddresses(currency, cb) {
    if (!this.client) return cb('No client connected');
    const opts = {};

    // Get the current address list for this currency
    let currentAddresses = this.addresses[currency];
    if (!currentAddresses) currentAddresses = [];
    const nextIdx = currentAddresses.length;

    switch(currency) {
      case 'BTC':
        // TODO: Bitcoin syncing logic. We need to consider a gap limit of 20
        // for regular addresses and a gap limit of 1 for change addresses.
        opts.startPath = [ harden(44), harden(0), harden(0), 0, nextIdx ];
        opts.n = 1;
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
      this.addresses[currency] = addresses;
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

    this.storageSession.save(this.deviceID, walletData);
  }

  initStorage() {
    // This function should never be called without a deviceID
    if (!this.deviceID) return;

    // Start a storage session and attempt to rehydrate the relevant
    // data for the current wallet UID.
    this.storageSession = new StorageSession(this.deviceID);
    const wallet_uid = this.client.activeWallet.uid;
    if (!wallet_uid.equals(EMPTY_WALLET_UID)) {
      // If we have a non-null wallet UID, rehydrate the data
      const walletData = this.storageSession.getWalletData(wallet_uid);
      this.addresses = walletData.addresses || {};
    }
    // If we do have a non-null wallet UID, we don't need to do anything
  }

  connect(deviceID, pw, cb, initialTimeout=CONSTANTS.ASYNC_SDK_TIMEOUT) {
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
      client.timeout = CONSTANTS.ASYNC_SDK_TIMEOUT;
      this.client = client;
      // Setup a new storage session
      this.deviceID = deviceID;
      this.initStorage();
      return cb(null, client.isPaired);
    });
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