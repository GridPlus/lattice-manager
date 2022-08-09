import store from '../store/persistanceStore';

class StorageSession {
  data: any;
  store: any;

  constructor() {
    this.data = null;
    this.store = store.getRootStore();
  }

  isObject (o) {
    try {
      return o && typeof o === 'object' && !Array.isArray(o);
    } catch (e) {
      return false;
    }
  }

  updateBranch (newData, oldData, key) {
    if (!this.isObject(oldData))
      return;

    if (this.isObject(newData[key]) && !oldData[key])
      oldData[key] = {};

    if (this.isObject(newData[key])) {
      Object.keys(newData[key]).forEach((newKey) => {
        if (this.isObject(newData[key][newKey]))
          this.updateBranch(newData[key], oldData[key], newKey)
        else
          oldData[key][newKey] = newData[key][newKey];
      });
    } else {
      oldData[key] = newData[key];
    }
  }

  save (deviceId, wallet_uid, data) {
    if (!this.store[deviceId]) this.store[deviceId] = {};
    if (!this.store[deviceId][wallet_uid]) this.store[deviceId][wallet_uid] = {};
    Object.keys(data).forEach((k) => {
      this.updateBranch(data, this.store[deviceId][wallet_uid], k);
    })
    store.setRootStore(this.store);
  }

  getWalletData (deviceId, wallet_uid) {
    if (!this.store[deviceId]) this.store[deviceId] = {};
    if (!this.store[deviceId][wallet_uid]) this.store[deviceId][wallet_uid] = {};
    return this.store[deviceId][wallet_uid];
  }
}


export default StorageSession;