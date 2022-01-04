import localStorage from "../localStorage";

const key = "test";
const value = 1;
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

  test("should store walletId", () => {
    localStorage.setWalletId(value);
    expect(localStorage.getWalletId()).toStrictEqual(value);
    localStorage.removeWalletId();
    expect(localStorage.getWalletId()).toBe(null);
  });

  test("should store walletPassword", () => {
    localStorage.setWalletPassword(value);
    expect(localStorage.getWalletPassword()).toStrictEqual(value);
    localStorage.removeWalletPassword();
    expect(localStorage.getWalletPassword()).toBe(null);
  });
});
