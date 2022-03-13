import isEmpty from "lodash/isEmpty";
import { useCallback, useContext, useEffect, useState } from "react";
import { AppContext } from "../store/AppContext";
import { Record } from "../types/records";
import { constants } from "../util/helpers";
import { useRequestFailed } from "./useRequestFailed";
const { CONTRACTS_PER_PAGE, ABI_PACK_URL } = constants;

/**
 * The `useContracts` hook is used to manage the external calls for fetching, adding, and removing
 * contract data on the user's Lattice; as well as fetching the public contract pack data.
 */
export const useContracts = () => {
  const {
    session,
    contracts,
    addContractsToState,
    removeContractsFromState,
    contractPacks,
    setContractPacks,
  } = useContext(AppContext);

  const {
    error,
    setError,
    retryFunction,
    setRetryFunctionWithReset,
  } = useRequestFailed();

  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetches the installed ABI contracts from the user's Lattice.
   */
  const fetchContracts = useCallback(
    async (fetched = 0, retries = 1) => {
      setIsLoading(true);

      return session.client
        .getAbiRecords({
          n: CONTRACTS_PER_PAGE,
          startIdx: fetched,
          category: "",
        })
        .then((res: any) => {
          const _contracts = res.records.map((r) => ({
            id: r.header.name,
            ...r,
          }));
          addContractsToState(_contracts);
          const totalFetched = res.numFetched + fetched;
          const remainingToFetch = res.numRemaining;
          if (remainingToFetch > 0) {
            fetchContracts(totalFetched);
          } else {
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (retries > 0) {
            setError(null);
            fetchContracts(fetched, retries - 1);
          } else {
            setError(err);
            setIsLoading(false);
            setRetryFunctionWithReset(fetchContracts);
          }
        });
    },
    [
      addContractsToState,
      session.client,
      setError,
      setIsLoading,
      setRetryFunctionWithReset,
    ]
  );

  /**
   * Removes installed ABI contracts from the user's Lattice.
   */
  const removeContracts = (contractsToRemove: Record[]) => {
    setIsLoading(true);
    const sigs = contractsToRemove.map((c) => c.header.sig);

    return session.client
      .removeAbiRecords({ sigs })
      .then(() => {
        removeContractsFromState(contractsToRemove);
      })
      .catch((err) => {
        setError(err);
        setRetryFunctionWithReset(() => removeContracts(contractsToRemove));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  /**
   * Installs new ABI contracts to the user's Lattice.
   */
  const addContracts = (contracts) => {
    setIsLoading(true);
    session.client.timeout = 2 * constants.ASYNC_SDK_TIMEOUT;

    return session.client
      .addAbiDefs(contracts)
      .then(() => {
        addContractsToState(contracts);
      })
      .catch((err) => {
        setError(err);
        setRetryFunctionWithReset(() => removeContracts(contracts));
      })
      .finally(() => {
        setIsLoading(false);
        session.client.timeout = constants.ASYNC_SDK_TIMEOUT;
      });
  };

  /**
   * Fetches the index of the publicly available contract pack data.
   */
  const fetchContractPackIndex = useCallback(
    () =>
      fetch(`${ABI_PACK_URL}/`)
        .then((res) => res.json())
        .catch(console.error),
    []
  );

  /**
   * Fetches the individual contract pack data for a given pack's `fname`.
   */
  const fetchContractPack = useCallback(
    (pack) =>
      fetch(`${ABI_PACK_URL}/${pack.fname}`)
        .then((res) => res.json())
        .catch(console.error),
    []
  );

  /**
   *  Fetch and save `ContractPacks` data.
   */
  useEffect(() => {
    if (isEmpty(contractPacks)) {
      fetchContractPackIndex().then(async (packs) => {
        setContractPacks(await Promise.all(packs.map(fetchContractPack)));
      });
    }
  }, [
    contractPacks,
    fetchContractPack,
    fetchContractPackIndex,
    setContractPacks,
  ]);

  return {
    contractPacks,
    fetchContracts,
    fetchContractPack,
    fetchContractPackIndex,
    isLoading,
    contracts,
    addContracts,
    removeContracts,
    addContractsToState,
    removeContractsFromState,
    error,
    setError,
    retryFunction,
  };
};
