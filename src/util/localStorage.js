import { constants } from "./helpers";
import omit from "lodash/omit";

const getItem = (key) => JSON.parse(window.localStorage.getItem(key));
const setItem = (key, value) =>
  window.localStorage.setItem(key, JSON.stringify(value));
const removeItem = (key) => window.localStorage.removeItem(key);

const getRootStore = () => getItem(constants.ROOT_STORE) ?? {};
const setRootStore = (value) =>
  window.localStorage.setItem(
    constants.ROOT_STORE,
    JSON.stringify({ ...getRootStore(), ...value })
  );
const removeRootStore = () => removeItem(constants.ROOT_STORE);

const getRootStoreItem = (key) => getItem(constants.ROOT_STORE)?.[key] ?? {};
const setRootStoreItem = (key, value) =>
  window.localStorage.setItem(
    constants.ROOT_STORE,
    JSON.stringify({ ...getRootStore(), [`${key}`]: value })
  );
const removeRootStoreItem = (key) =>
  window.localStorage.setItem(
    constants.ROOT_STORE,
    JSON.stringify(omit(getRootStore(), key))
  );

const getSettings = () => getRootStoreItem("settings");
const setSettings = (value) => setRootStoreItem("settings", value)

const getKeyring = () => getRootStoreItem("keyring");

const getKeyringItem = (key) => getRootStoreItem("keyring")?.[key];
const setKeyringItem = (key, value) =>
  setRootStoreItem("keyring", { [`${key}`]: value });
const removeKeyringItem = (key) =>
  setRootStoreItem("keyring", omit(getKeyring(), key));

const getWalletId = () => getItem(constants.WALLET_ID_STORAGE_KEY);
const setWalletId = (value) => setItem(constants.WALLET_ID_STORAGE_KEY, value);
const removeWalletId = () => removeItem(constants.WALLET_ID_STORAGE_KEY);

const getWalletPassword = () => getItem(constants.WALLET_PASSWORD_STORAGE_KEY);
const setWalletPassword = (value) =>
  setItem(constants.WALLET_PASSWORD_STORAGE_KEY, value);
const removeWalletPassword = () =>
  removeItem(constants.WALLET_PASSWORD_STORAGE_KEY);

export default {
  getItem,
  setItem,
  removeItem,
  getRootStore,
  setRootStore,
  removeRootStore,
  getRootStoreItem,
  setRootStoreItem,
  removeRootStoreItem,
  getSettings,
  setSettings,
  getWalletId,
  setWalletId,
  removeWalletId,
  getWalletPassword,
  setWalletPassword,
  removeWalletPassword,
  getKeyring,
  getKeyringItem,
  setKeyringItem,
  removeKeyringItem,
};
