import { createContext, ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLattice } from "../hooks/useLattice";
import { sendErrorNotification } from "../util/sendErrorNotification";
import BitcoinSession from "./BitcoinSession";

export const BitcoinContext = createContext(undefined);

export const BitcoinContextProvider = ({
  children,
  overrides,
}: {
  children: ReactNode;
  overrides?: { [key: string]: any };
}) => {
  const navigate = useNavigate();
  const { client, password, deviceId, connect } = useLattice();
  const [isLoadingBtcData, setIsLoadingBtcData] = useState(false);

  const [session, setSession] = useState<BitcoinSession>(
    new BitcoinSession(client, deviceId)
  );
  const isMobile = false;

  useEffect(() => {
    if (!session.client) {
      setSession(new BitcoinSession(client, deviceId));
    }
  }, [session.client, client, deviceId]);

  // Fetch up-to-date blockchain state data for the addresses stored in our
  // SDKSession. Called after we load addresses for the first time
  // Passing `isRecursion=true` means we will attempt to fetch new
  // addresses based on known state data and if we do not yield any new ones
  // we should exit. This is done to avoid naively requesting state data
  // for all known addresses each time we add a new one based on a gap limit.
  // For example, an initial sync will get 20 addrs and fetch state data. It
  // may then request one address at a time and then state data for that one
  // address until the gap limit is reached.
  const fetchBtcData = async (isRecursion = false) => {
    setIsLoadingBtcData(true);
    const isPaired = await connect(deviceId, password).catch((err) => {
      navigate("/");
    });
    if (!isPaired) {
      return;
    }
    session.fetchBtcAddresses((err, newAddrCounts) => {
      if (err) {
        sendErrorNotification(err);
        setIsLoadingBtcData(false);
        return;
      }
      const shouldExit =
        isRecursion &&
        newAddrCounts.regular === 0 &&
        newAddrCounts.change === 0;
      if (shouldExit) {
        // Done syncing
        setIsLoadingBtcData(false);
        return;
      }
      // If this is the first time we are calling this function,
      // start by clearing UTXOs to avoid stale balances
      if (!isRecursion) {
        session.clearUtxos();
      }
      // Sync data now
      const opts = isRecursion ? newAddrCounts : null;
      session.fetchBtcStateData(opts, (err) => {
        if (err) {
          console.error("Error fetching BTC state data", err);
          sendErrorNotification(err);
          setIsLoadingBtcData(false);
          return;
        }
        fetchBtcData(true);
      });
    });
  };

  const defaultContext = {
    session,
    isMobile,
    fetchBtcData,
    isLoadingBtcData,
  };

  return (
    <BitcoinContext.Provider value={{ ...defaultContext, ...overrides }}>
      {children}
    </BitcoinContext.Provider>
  );
};
