import { Client } from 'gridplus-sdk';
const Buffer = require('buffer/').Buffer;
const ReactCrypto = require('gridplus-react-crypto').default;

class SDKSession {
  constructor() {
    this.client = null;
    this.crypto = null;
  }

  disconnect() {
    this.client = null;
  }

  isConnected() {
    return this.client !== null;
  }

  connect(deviceID, pw, cb) {
    // Reject the request if there is already a client session
    if (this.client !== null)
      return cb('Client already exists in session. Please call disconnect() first.');

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
    })
    client.connect(deviceID, (err) => {
      if (err) return cb(err);
      this.client = client;
      return cb();
    });
  }

  _genPrivKey(deviceID, pw) {
    const key = Buffer.concat([Buffer.from(pw), Buffer.from(deviceID)])
    // Create a new instance of ReactCrypto using the key as entropy
    this.crypto = new ReactCrypto(key);
    return this.crypto.createHash('sha256').update(key).digest();
  }

}

export default SDKSession