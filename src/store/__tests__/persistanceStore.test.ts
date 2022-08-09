import store from "../persistanceStore";
import StorageSession from "../../util/storageSession";

const key = "test";
const newKey = "newKey";
const index = "newIndex";
const indexTwo = "newIndexTwo";
const value = 1;
const valueTwo = 2;
const obj = { [key]: value };

describe("store", () => {
  test("should store data", () => {
    store.setItem(key, value);
    expect(store.getItem(key)).toStrictEqual(value);
    store.removeItem(key);
    expect(store.getItem(key)).toBe(null);
  });

  test("should store root data", () => {
    store.setRootStore(obj);
    expect(store.getRootStore()).toStrictEqual(obj);
    store.removeRootStore();
    expect(store.getRootStore()).toStrictEqual({});
  });

  test("should store root data item", () => {
    store.setRootStoreItem(key, value);
    expect(store.getRootStoreItem(key)).toStrictEqual(value);
    store.setRootStoreItem(key, obj);
    expect(store.getRootStoreItem(key)).toStrictEqual(obj);
    store.removeRootStoreItem(key);
    expect(store.getRootStoreItem(key)).toStrictEqual({});
  });

  test("should store settings", () => {
    store.setSettings(obj);
    expect(store.getSettings()).toStrictEqual(obj);
  });

  test("should get keyring", () => {
    store.setRootStoreItem("keyring", obj);
    expect(store.getKeyring()).toStrictEqual(obj);
  });

  test("should store keyring items", () => {
    store.setKeyringItem(key, obj);
    expect(store.getKeyringItem(key)).toStrictEqual(obj);
    store.removeKeyringItem(key);
    expect(store.getKeyringItem(key)).toStrictEqual({});
  });

  test("should rename keyring items", () => {
    store.setKeyringItem(key, obj);
    expect(store.getKeyringItem(key)).toStrictEqual(obj);
    store.renameKeyringItem(key, newKey);
    expect(store.getKeyringItem(newKey)).toStrictEqual(obj);
    store.renameKeyringItem(newKey, newKey);
    expect(store.getKeyringItem(newKey)).toStrictEqual(obj);
    store.renameKeyringItem(newKey, newKey.toLowerCase());
    expect(store.getKeyringItem(newKey)).toStrictEqual({});
    expect(store.getKeyringItem(newKey.toLowerCase())).toStrictEqual(obj);
  });

  test("should store deviceId", () => {
    store.setDeviceId(value);
    expect(store.getDeviceId()).toStrictEqual(value);
    store.removeDeviceId();
    expect(store.getDeviceId()).toBe(null);
  });

  test("should store password", () => {
    store.setPassword(value);
    expect(store.getPassword()).toStrictEqual(value);
    store.removePassword();
    expect(store.getPassword()).toBe(null);
  });

  test("should store login", () => {
    store.setLogin({ deviceId: key, password: value });
    expect(store.getLogin()).toStrictEqual({ deviceId: key, password: value });
    store.removeLogin();
    expect(store.getLogin()).toStrictEqual({ deviceId: null, password: null });
  });

  test("should store device indexed items", () => {
    store.setLogin({ deviceId: key, password: value });
    store.setDeviceIndexedItem(index, value);
    expect(store.getDeviceIndexedItem(index)).toStrictEqual(value);
    store.setDeviceIndexedItem(indexTwo, valueTwo);
    expect(store.getDeviceIndexedItem(index)).toStrictEqual(value);
    store.removeDeviceIndexedItem(indexTwo);
    expect(store.getDeviceIndexedItem(indexTwo)).toStrictEqual(undefined);
    store.removeLogin();
    expect(store.getDeviceIndexedItem(index)).toStrictEqual(undefined);
  });
});
