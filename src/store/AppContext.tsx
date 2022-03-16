import React, { createContext, ReactNode, useEffect, useState } from "react";
import SDKSession from "../sdk/sdkSession";

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

  const defaultContext = {
    isMobile,
    session,
    setSession,
  };

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
