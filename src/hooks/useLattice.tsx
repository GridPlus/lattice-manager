import { Client } from "gridplus-sdk";
import { useCallback, useContext, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppContext } from "../store/AppContext";
import store from "../store/persistanceStore";
import { genPrivKey } from "../util/crypto";
import { constants } from "../util/helpers";
import { sendErrorNotification } from "../util/sendErrorNotification";
import { useUrlParams } from "./useUrlParams";
const Buffer = require("buffer/").Buffer;
const { LOGIN_PARAM, KEYRING_LOGOUT_MS, BASE_SIGNING_URL } = constants;

export const useLattice = () => {
  const navigate = useNavigate();
  const {
    deviceId,
    setDeviceId,
    password,
    setPassword,
    integrationName,
    setIntegrationName,
    isLoadingClient,
    setIsLoadingClient,
    client,
    setClient,
    activeWallet,
    setActiveWallet,
  } = useContext(AppContext);
  const location = useLocation();
  const { keyring, forceLogin, isLoggedIn, hwCheck } = useUrlParams();

  const wasOpenedByKeyring = !!keyring; // Was the app opened with a keyring in the url parameters

  const getBaseUrl = () => {
    const settings = store.getSettings();
    if (settings.customEndpoint && settings.customEndpoint !== "") {
      return settings.customEndpoint;
    } else {
      return constants.BASE_SIGNING_URL;
    }
  };

  const initializeClient = async (
    _deviceId = deviceId,
    _password = password
  ) => {
    if (hwCheck) {
      setIsLoadingClient(false);
      // For backwards compatibility, we will route the user to the /validate page
      // in the past, there was no concept of "pages", it was a true SPA
      if (location.pathname !== "/validate") {
        navigate({
          pathname: "/validate",
          search: `?hwCheck=${hwCheck}`,
        });
      }
      return;
    }
    if (!isAuthenticated() && location.pathname !== "/") {
      setIsLoadingClient(false);
      navigate("/");
    } else if (_deviceId && _password && !isConnected()) {
      return connect(_deviceId, _password)
        .then(async (isPaired) => {
          if (wasOpenedByKeyring) {
            if (!isPaired) {
              navigate({
                pathname: "/pair",
                search: `?keyring=${keyring}&forceLogin=${forceLogin}`,
              });
            } else {
              return returnKeyringData(_deviceId, _password);
            }
          } else if (isPaired) {
            if (!location.pathname.includes("/manage")) {
              navigate({
                pathname: "/manage",
              });
            }
          } else {
            navigate({
              pathname: "/pair",
            });
          }
        })
        .catch((err) => {
          sendErrorNotification(err);
          handleLogout();
          navigate({
            pathname: "/",
          });
        })
        .finally(() => {
          setIsLoadingClient(false);
        });
    } else {
      setIsLoadingClient(false);
    }
  };

  const disconnect = useCallback(() => {
    setClient(undefined);
    setDeviceId(undefined);
    setPassword(undefined);
  }, [setClient, setDeviceId, setPassword]);

  const handleLogout = useCallback(() => {
    disconnect();
    store.removeLogin();
    store.removeAddresses();
    navigate("/");
  }, [navigate, disconnect]);

  const isAuthenticated = () => {
    return deviceId && password;
  };

  const isConnected = () => {
    return !!client;
  };

  const isPaired = () => {
    return client?.isPaired || false;
  };

  const updateActiveWallet = useCallback(
    async ({ refetch } = { refetch: false }) => {
      if (!client) {
        return null;
      }
      if (!client.getActiveWallet() || refetch) {
        await client.fetchActiveWallet();
      }
      setActiveWallet(() => {
        return client.getActiveWallet();
      });
    },
    [client, setActiveWallet]
  );

  const connect = async (
    deviceId: string,
    password: string
  ): Promise<boolean> => {
    let _client: Client = client
      ? client
      : new Client({
          name: integrationName,
          privKey: genPrivKey(deviceId, password, integrationName),
          baseUrl: getBaseUrl(),
          timeout: constants.SHORT_TIMEOUT, // Artificially short timeout just for connecting
          skipRetryOnWrongWallet: false,
        });

    return _client.connect(deviceId).then((isPaired) => {
      // Update the timeout to a longer one for future async requests
      _client.timeout = constants.ASYNC_SDK_TIMEOUT;
      setClient(_client);
      setDeviceId(deviceId);
      setPassword(password);
      setActiveWallet(_client.getActiveWallet());
      return isPaired;
    });
  };

  useEffect(() => {
    if (keyring) {
      // Check if this keyring has already logged in.
      const prevKeyringLogin = store.getKeyringItem(keyring);
      // This login should expire after a period of time.
      const keyringTimeoutBoundary = new Date().getTime() - KEYRING_LOGOUT_MS;
      const isKeyringExpired =
        prevKeyringLogin.lastLogin > keyringTimeoutBoundary;

      if (!forceLogin && prevKeyringLogin && isKeyringExpired) {
        setDeviceId(prevKeyringLogin.deviceId);
        setPassword(prevKeyringLogin.password);
      } else {
        // If the login has expired, clear it now.
        store.removeKeyringItem(keyring);
      }
    }
  }, [keyring, setDeviceId, setPassword, forceLogin, isLoggedIn]);

  const returnKeyringData = useCallback(
    (deviceId: string, password: string) => {
      if (!wasOpenedByKeyring) return;
      // Save the login for later
      store.setKeyringItem(integrationName, {
        deviceId: deviceId,
        password: password,
        lastLogin: new Date().getTime(),
      });
      // Send the data back to the opener
      const data = {
        deviceID: deviceId, // Integrations expect `deviceID` with capital `D`
        password: password,
        endpoint: BASE_SIGNING_URL,
      };
      // Check if there is a custom endpoint configured
      const settings = store.getSettings();
      if (settings.customEndpoint && settings.customEndpoint !== "") {
        data.endpoint = settings.customEndpoint;
      }
      const location = window.location.href; // save before `handleLogout` wipes location
      handleLogout();
      if (window.opener) {
        // If there is a `window.opener` we can just post back
        window.opener.postMessage(JSON.stringify(data), "*");
        window.close();
      } else {
        // Otherwise we need a workaround to let the originator
        // know we have logged in. We will put the login data
        // into the URL and the requesting app will fetch that.
        // Note that the requesting extension is now responsible for
        // closing this web page.
        const enc = Buffer.from(JSON.stringify(data)).toString("base64");
        window.location.href = `${location}&${LOGIN_PARAM}=${enc}`;
      }
    },
    [wasOpenedByKeyring, integrationName, handleLogout]
  );

  return {
    client,
    connect,
    deviceId,
    setDeviceId,
    disconnect,
    activeWallet,
    updateActiveWallet,
    handleLogout,
    initializeClient,
    isAuthenticated,
    isConnected,
    isLoadingClient,
    isPaired,
    password,
    setPassword,
    integrationName,
    setIntegrationName,
    returnKeyringData,
  };
};
