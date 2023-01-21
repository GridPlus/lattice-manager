import React, { createContext, ReactNode, useEffect, useState } from "react";
import { useRecords } from "../hooks/useRecords";
import SDKSession from "../sdk/sdkSession";
import localStorage from "../util/localStorage";

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 500);
  const [session, setSession] = useState<SDKSession>(null);

  const [isLoadingAddressTags, setIsLoadingAddressTags] = useState(false);
  const [
    addressTags,
    addAddressTagsToState,
    removeAddressTagsFromState,
    resetAddressTagsInState,
  ] = useRecords(localStorage.getAddresses() ?? []);

  const defaultContext = {
    isMobile,
    session,
    setSession,
    isLoadingAddressTags,
    setIsLoadingAddressTags,
    addressTags,
    addAddressTagsToState,
    removeAddressTagsFromState,
    resetAddressTagsInState,
  };

  /**
   * Whenever `addresses` data changes, it is persisted to `localStorage`
   */
  useEffect(() => {
    localStorage.setAddresses(addressTags);
  }, [addressTags]);

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
