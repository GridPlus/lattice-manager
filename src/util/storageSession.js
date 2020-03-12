import { constants } from './helpers';
class StorageSession {
  constructor(device_id, pass) {
    this.data = null;
    this.store = JSON.parse(window.localStorage.getItem(constants.ROOT_STORE) || '{}');
  }

  save(deviceID, wallet_uid, data) {
    // Get the data for this deviceID
    if (!this.store[deviceID]) this.store[deviceID] = {};
    if (!this.store[deviceID][wallet_uid]) this.store[deviceID][wallet_uid] = {};
    // Update relevant keys without overwriting anything else
    Object.keys(data).forEach((k) => {
      this.store[deviceID][wallet_uid][k] = data[k];
    })
    // Update the store itself
    window.localStorage.setItem(constants.ROOT_STORE, JSON.stringify(this.store));
  }

  getWalletData(deviceID, wallet_uid) {
    if (!this.store[deviceID]) this.store[deviceID] = {};
    if (!this.store[deviceID][wallet_uid]) this.store[deviceID][wallet_uid] = {};
    return this.store[deviceID][wallet_uid];
  }

  saveERC20Token(token, env='prod') {
    if (!this.store[env]) this.store[env] = { erc20Tokens: {} };
    // Sanity checks
    if (!token || !token.symbol || !token.decimals || !token.address || !token.name)
      return false;
    // Save the token to local storage
    this.store[env].erc20Tokens[token.address] = token;
    window.localStorage.setItem(constants.ROOT_STORE, JSON.stringify(this.store));
    return true;
  }

  getERC20Tokens(env='prod') {
    if (!this.store[env] || !this.store[env].erc20Tokens)
      return [];
    // Get the list of tokens
    const tokens = [];
    Object.keys(this.store[env].erc20Tokens).forEach((k) => {
      tokens.push(this.store[env].erc20Tokens[k]);
    })
    return tokens.sort(function(a, b) { return a.name > b.name ? 1 : -1 })
  }
}


export default StorageSession;