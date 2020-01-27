
class StorageSession {
  constructor(device_id, pass) {
    this.data = null;
    this.store = JSON.parse(window.localStorage.getItem('gridplus') || '{}');
  }

  save(deviceID, data) {
    // Get the data for this deviceID
    const _data = this.store[deviceID] || {};
    // Update relevant keys without overwriting anything else
    Object.keys(data).forEach((k) => {
      _data[k] = data[k];
    })
    // Update the store itself
    this.store[deviceID] = _data;
    window.localStorage.setItem('gridplus', JSON.stringify(this.store));
  }

  getWalletData(wallet_uid) {
    return this.store[wallet_uid];
  }
}


export default StorageSession;