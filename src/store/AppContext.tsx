import { Client } from "gridplus-sdk";
import { createContext, ReactNode, useEffect, useState } from "react";
import { useIntegrationName } from "../hooks/useAppName";
import { useRecords } from "../hooks/useRecords";
import store from "./persistanceStore";

/**
 * A React Hook that allows us to pass data down the component tree without having to pass
 * props.
 */
export const AppContext = createContext(undefined);

export const AppContextProvider = ({
  children,
  overrides,
}: {
  children: ReactNode;
  overrides?: { [key: string]: any };
}) => {
  const { integrationName, setIntegrationName } = useIntegrationName();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 500);
  const [deviceId, setDeviceId] = useState<string>(store.getDeviceId());
  const [password, setPassword] = useState<string>(store.getPassword());
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [activeWallet, setActiveWallet] = useState<any>();
  const [
    addresses,
    addAddressesToState,
    removeAddressesFromState,
    resetAddressesInState,
  ] = useRecords(store.getAddresses() ?? []);
  const [client, setClient] = useState<Client | null>(null);

  const defaultContext = {
    isMobile,
    isLoadingAddresses,
    setIsLoadingAddresses,
    isLoadingClient,
    setIsLoadingClient,
    addresses,
    addAddressesToState,
    removeAddressesFromState,
    resetAddressesInState,
    deviceId,
    setDeviceId,
    password,
    setPassword,
    integrationName,
    setIntegrationName,
    client,
    setClient,
    activeWallet,
    setActiveWallet,
  };

  /**
   * Whenever `addresses` data changes, it is persisted to `store`
   */
  useEffect(() => {
    store.setAddresses(addresses);
  }, [addresses]);

  /**
   * Whenever `deviceId` data changes, it is persisted to `store`
   */
  useEffect(() => {
    store.setDeviceId(deviceId);
  }, [deviceId]);

  /**
   * Whenever `password` data changes, it is persisted to `store`
   */
  useEffect(() => {
    store.setPassword(password);
  }, [password]);

  /**
   * Sets `isMobile` when the window resizes.
   * */
  useEffect(() => {
    window.addEventListener("resize", () => {
      const windowIsMobileWidth = window.innerWidth < 500;
      if (windowIsMobileWidth && !isMobile) setIsMobile(true);
      if (!windowIsMobileWidth && isMobile) setIsMobile(false);
    });
  }, [isMobile]);

  return (
    <AppContext.Provider value={{ ...defaultContext, ...overrides }}>
      {children}
    </AppContext.Provider>
  );
};
