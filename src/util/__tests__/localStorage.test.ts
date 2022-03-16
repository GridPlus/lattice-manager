import localStorage from "../localStorage";

const key = "test";
const newKey = "newKey"
const index = "newIndex"
const indexTwo = "newIndexTwo"
const value = 1;
const valueTwo = 2;
const obj = { [key]: value };

describe("localStorage", () => {
  test("should store data", () => {
    localStorage.setItem(key, value);
    expect(localStorage.getItem(key)).toStrictEqual(value);
    localStorage.removeItem(key);
    expect(localStorage.getItem(key)).toBe(null);
  });

  test("should store root data", () => {
    localStorage.setRootStore(obj);
    expect(localStorage.getRootStore()).toStrictEqual(obj);
    localStorage.removeRootStore();
    expect(localStorage.getRootStore()).toStrictEqual({});
  });

  test("should store root data item", () => {
    localStorage.setRootStoreItem(key, value);
    expect(localStorage.getRootStoreItem(key)).toStrictEqual(value);
    localStorage.setRootStoreItem(key, obj);
    expect(localStorage.getRootStoreItem(key)).toStrictEqual(obj);
    localStorage.removeRootStoreItem(key);
    expect(localStorage.getRootStoreItem(key)).toStrictEqual({});
  });

  test("should store settings", () => {
    localStorage.setSettings(obj);
    expect(localStorage.getSettings()).toStrictEqual(obj);
  });

  test("should get keyring", () => {
    localStorage.setRootStoreItem("keyring", obj);
    expect(localStorage.getKeyring()).toStrictEqual(obj);
  });

  test("should store keyring items", () => {
    localStorage.setKeyringItem(key, obj);
    expect(localStorage.getKeyringItem(key)).toStrictEqual(obj);
    localStorage.removeKeyringItem(key);
    expect(localStorage.getKeyringItem(key)).toStrictEqual({});
  });

  test("should rename keyring items", () => {
    localStorage.setKeyringItem(key, obj);
    expect(localStorage.getKeyringItem(key)).toStrictEqual(obj);
    localStorage.renameKeyringItem(key, newKey)
    expect(localStorage.getKeyringItem(newKey)).toStrictEqual(obj);
    localStorage.renameKeyringItem(newKey, newKey)
    expect(localStorage.getKeyringItem(newKey)).toStrictEqual(obj);
    localStorage.renameKeyringItem(newKey, newKey.toLowerCase())
    expect(localStorage.getKeyringItem(newKey)).toStrictEqual({});
    expect(localStorage.getKeyringItem(newKey.toLowerCase())).toStrictEqual(obj);
  });

  test("should store loginId", () => {
    localStorage.setLoginId(value);
    expect(localStorage.getLoginId()).toStrictEqual(value);
    localStorage.removeLoginId();
    expect(localStorage.getLoginId()).toBe(null);
  });

  test("should store loginPassword", () => {
    localStorage.setLoginPassword(value);
    expect(localStorage.getLoginPassword()).toStrictEqual(value);
    localStorage.removeLoginPassword();
    expect(localStorage.getLoginPassword()).toBe(null);
  });

  test("should store login", () => {
    localStorage.setLogin({deviceID: key, password: value});
    expect(localStorage.getLogin()).toStrictEqual({deviceID: key, password: value});
    localStorage.removeLogin();
    expect(localStorage.getLogin()).toStrictEqual({deviceID: null, password: null});
  });

  test("should store device indexed items", () => {
    localStorage.setLogin({deviceID: key, password: value});
    localStorage.setDeviceIndexedItem(index, value)
    expect(localStorage.getDeviceIndexedItem(index)).toStrictEqual(value);
    localStorage.setDeviceIndexedItem(indexTwo, valueTwo)
    expect(localStorage.getDeviceIndexedItem(index)).toStrictEqual(value);
    localStorage.removeDeviceIndexedItem(indexTwo)
    expect(localStorage.getDeviceIndexedItem(indexTwo)).toStrictEqual(undefined);
    localStorage.removeLogin()
    expect(localStorage.getDeviceIndexedItem(index)).toStrictEqual(undefined);
  });
});
