import { useState } from "react";

export const useRouter = () => {
  const ROUTES = {
    WALLET: "wallet",
    RECEIVE: "receive",
    CONNECT: "connect",
    PAIR: "pair",
    SEND: "send",
    SETTINGS: "settings",
    RECORDS: "records",
    SUCCESS: "success",
    HW_CHECK: "hwCheck",
    MISSING_WALLET: "missing-wallet",
    LOADING: "loading",
    LANDING: "landing",
  };
  const DEFAULT_ROUTE = ROUTES.LANDING;
  const [route, setRoute] = useState(DEFAULT_ROUTE);
  
  return { route,  setRoute,  ROUTES,  DEFAULT_ROUTE}
};
