import omit from "lodash/omit";

const LOGIN_ID_STORAGE_KEY = "gridplus_web_wallet_id";
const LOGIN_PASSWORD_STORAGE_KEY = "gridplus_web_wallet_password";
const ADDRESSES_STORAGE_KEY = "gridplus_addresses";
const CONTRACTS_STORAGE_KEY = "gridplus_contracts";
const CONTRACT_PACKS_STORAGE_KEY = "gridplus_contracts_packs";
const ROOT_STORE = process.env.REACT_APP_ROOT_STORE || "gridplus";

// #region -- Generic Local Storage Functions

const getItem = (key) => {
  const value = window.localStorage.getItem(key);
  try {
    return JSON.parse(value);
  } catch (e) {
    return JSON.parse(JSON.stringify(value));
  }
};
const setItem = (key, value) =>
  window.localStorage.setItem(key, JSON.stringify(value));
const removeItem = (key) => window.localStorage.removeItem(key);

const getRootStore = () => getItem(ROOT_STORE) ?? {};
const setRootStore = (value) =>
  window.localStorage.setItem(
    ROOT_STORE,
    JSON.stringify({ ...getRootStore(), ...value })
  );
const removeRootStore = () => removeItem(ROOT_STORE);

const getRootStoreItem = (key) => getItem(ROOT_STORE)?.[key] ?? {};
const setRootStoreItem = (key, value) =>
  window.localStorage.setItem(
    ROOT_STORE,
    JSON.stringify({ ...getRootStore(), [`${key}`]: value })
  );
const removeRootStoreItem = (key) =>
  window.localStorage.setItem(
    ROOT_STORE,
    JSON.stringify(omit(getRootStore(), key))
  );

// #endregion

// #region -- Settings Functions

const getSettings = () => getRootStoreItem("settings");
const setSettings = (value) => setRootStoreItem("settings", value);

// #endregion

// #region -- Keyring Functions

const getKeyring = () => getRootStoreItem("keyring");
const setKeyring = (value) => setRootStoreItem("keyring", value);

const getKeyringItem = (key) => getRootStoreItem("keyring")?.[key] ?? {};
const setKeyringItem = (key, value) =>
  setRootStoreItem("keyring", { [`${key}`]: value });
const removeKeyringItem = (key) =>
  setRootStoreItem("keyring", omit(getKeyring(), key));
const renameKeyringItem = (oldKey, newKey) => {
  if (oldKey !== newKey) {
    const item = { ...getKeyringItem(oldKey) };
    setKeyringItem(newKey, item);
    removeKeyringItem(oldKey);
  }
};

// #endregion

// #region -- Login Functions

const getLoginId = () => getItem(LOGIN_ID_STORAGE_KEY);
const setLoginId = (value) => setItem(LOGIN_ID_STORAGE_KEY, value);
const removeLoginId = () => removeItem(LOGIN_ID_STORAGE_KEY);

const getLoginPassword = () => getItem(LOGIN_PASSWORD_STORAGE_KEY);
const setLoginPassword = (value) => setItem(LOGIN_PASSWORD_STORAGE_KEY, value);
const removeLoginPassword = () => removeItem(LOGIN_PASSWORD_STORAGE_KEY);

const getLogin = () => ({
  deviceID: getLoginId(),
  password: getLoginPassword(),
});
const setLogin = ({ deviceID, password }) => {
  setLoginId(deviceID);
  setLoginPassword(password);
};
const removeLogin = () => {
  removeLoginId();
  removeLoginPassword();
};

// #endregion

// #region -- Device Indexed Functions

const getDeviceIndexedItem = (key) => {
  const deviceId = getLoginId();
  if (deviceId) {
    return getRootStoreItem(deviceId)?.[key];
  }
};

const setDeviceIndexedItem = (key, value) => {
  const deviceId = getLoginId();
  if (deviceId && value) {
    return setRootStoreItem(deviceId, {
      ...getRootStoreItem(deviceId),
      [`${key}`]: value,
    });
  }
};

const removeDeviceIndexedItem = (key) => {
  const deviceId = getLoginId();
  if (deviceId) {
    return setRootStoreItem(deviceId, omit(getRootStoreItem(deviceId), key));
  }
};

// #endregion

// #region -- Address & Contracts Functions

const getAddresses = () => getDeviceIndexedItem(ADDRESSES_STORAGE_KEY);
const setAddresses = (value) =>
  setDeviceIndexedItem(ADDRESSES_STORAGE_KEY, value);
const removeAddresses = () => removeDeviceIndexedItem(ADDRESSES_STORAGE_KEY);

const getContracts = () => getDeviceIndexedItem(CONTRACTS_STORAGE_KEY);
const setContracts = (value) =>
  setDeviceIndexedItem(CONTRACTS_STORAGE_KEY, value);
const removeContracts = () => removeDeviceIndexedItem(CONTRACTS_STORAGE_KEY);

const getContractPacks = () => getItem(CONTRACT_PACKS_STORAGE_KEY) ?? [];
const setContractPacks = (value) => setItem(CONTRACT_PACKS_STORAGE_KEY, value);
const removeContractPacks = () => removeItem(CONTRACT_PACKS_STORAGE_KEY);

// #endregion

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
  getLoginId,
  setLoginId,
  removeLoginId,
  getLoginPassword,
  setLoginPassword,
  removeLoginPassword,
  getKeyring,
  setKeyring,
  getKeyringItem,
  setKeyringItem,
  removeKeyringItem,
  renameKeyringItem,
  getLogin,
  setLogin,
  removeLogin,
  getDeviceIndexedItem,
  setDeviceIndexedItem,
  removeDeviceIndexedItem,
  getAddresses,
  setAddresses,
  removeAddresses,
  getContracts,
  setContracts,
  removeContracts,
  getContractPacks,
  setContractPacks,
  removeContractPacks,
};
