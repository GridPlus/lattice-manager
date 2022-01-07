import omit from "lodash/omit";

const LOGIN_ID_STORAGE_KEY = "gridplus_web_wallet_id";
const LOGIN_PASSWORD_STORAGE_KEY = "gridplus_web_wallet_password";
const ROOT_STORE = process.env.REACT_APP_ROOT_STORE || "gridplus";

// #region -- Generic Local Storage Functions

const getItem = (key) => {
  const value = window.localStorage.getItem(key);
  try {
    return JSON.parse(value)
  } catch (e) {
    return JSON.parse(JSON.stringify(value))
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

const getKeyringItem = (key) => getRootStoreItem("keyring")?.[key] ?? {};
const setKeyringItem = (key, value) =>
  setRootStoreItem("keyring", { [`${key}`]: value });
const removeKeyringItem = (key) =>
  setRootStoreItem("keyring", omit(getKeyring(), key));

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
  getKeyringItem,
  setKeyringItem,
  removeKeyringItem,
  getLogin,
  setLogin,
  removeLogin,
};
