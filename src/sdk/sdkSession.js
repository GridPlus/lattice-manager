import { Client } from 'gridplus-sdk';
import { CONSTANTS } from '../constants';
const Buffer = require('buffer/').Buffer;
const ReactCrypto = require('gridplus-react-crypto').default;

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
  }

  disconnect() {
    this.client = null;
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

  loadAddresses(currency, cb) {
    // Dummy code
    setTimeout(() => {
      // this.addresses[currency] = ['0xb91BcFD9D30178E962F0d6c204cE7Fd09C05D84C']
      // return cb(null);
      return cb("Failed to load addresses");
    }, 3000)
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