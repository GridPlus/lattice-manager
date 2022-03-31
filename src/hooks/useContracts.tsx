import { GetAbiRecordsData } from "gridplus-sdk/dist/types/client";
import isEmpty from "lodash/isEmpty";
import { useCallback, useContext, useEffect, useState } from "react";
import SDKSession from "../sdk/sdkSession";
import { AppContext } from "../store/AppContext";
import { ContractRecord, LatticeContract } from "../types/contracts";
import { transformLatticeContractToContractRecord } from "../util/contracts";
import { constants } from "../util/helpers";
import localStorage from "../util/localStorage";
import { useRecords } from "./useRecords";
import { useRequestFailed } from "./useRequestFailed";
const { CONTRACTS_PER_PAGE, ABI_PACK_URL } = constants;

/**
 * The `useContracts` hook is used to manage the external calls for fetching, adding, and removing
 * contract data on the user's Lattice, as well as fetching the public contract pack data, and
 * caching that data in `localStorage`.
 */
export const useContracts = () => {
  const { session }: { session: SDKSession } = useContext(AppContext);

  const [
    contracts,
    addContractsToState,
    removeContractsFromState,
    resetContractsInState,
  ] = useRecords<ContractRecord>(localStorage.getContracts() ?? []);

  const [contractPacks, setContractPacks] = useState(
    localStorage.getContractPacks()
  );

  const { error, setError, retryFunction, setRetryFunctionWithReset } =
    useRequestFailed();

  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetches the installed ABI contracts from the user's Lattice.
   */
  const fetchContracts = useCallback(
    async (fetched = 0, retries = 1) => {
      setIsLoading(true);
      return session.client
        .getAbiRecords({
          startIdx: fetched,
          n: CONTRACTS_PER_PAGE,
          category: "",
        })
        .then(
          //@ts-expect-error - SDK return type for `getAbiRecords` needs to be updated
          (res: GetAbiRecordsData) => {
            const _contracts = res.records.map(
              transformLatticeContractToContractRecord
            );
            addContractsToState(_contracts);
            const totalFetched = res.numFetched + fetched;
            const remainingToFetch = res.numRemaining;
            if (remainingToFetch > 0) {
              fetchContracts(totalFetched);
            } else {
              setIsLoading(false);
            }
          }
        )
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
    [addContractsToState, session.client, setError, setRetryFunctionWithReset]
  );

  /**
   * Removes installed ABI contracts from the user's Lattice.
   */
  const removeContracts = (contractsToRemove: ContractRecord[]) => {
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
  const addContracts = (contracts: ContractRecord[]) => {
    setIsLoading(true);
    session.client.timeout = 2 * constants.ASYNC_SDK_TIMEOUT;

    return session.client
      .addAbiDefs(contracts)
      .then(() => {
        addContractsToState(contracts);
      })
      .catch((err) => {
        setError(err);
        setRetryFunctionWithReset(() => addContracts(contracts));
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
   *  Fetches `ContractPacks` by fetching the index and then each pack.
   */
  const fetchContractPacks = useCallback(() => {
    setIsLoading(true);
    fetchContractPackIndex()
      .then(async (packs) => {
        setContractPacks(await Promise.all(packs.map(fetchContractPack)));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [fetchContractPack, fetchContractPackIndex]);

  /**
   * Resets `ContractPacks` data to it's default.
   */
  const resetContractPacksInState = useCallback(() => {
    localStorage.removeContractPacks();
  }, []);

  /**
   *  Fetch and save `ContractPacks` data.
   */
  useEffect(() => {
    if (isEmpty(contractPacks)) {
      fetchContractPacks();
    }
  }, [contractPacks, fetchContractPacks]);

  /**
   * Whenever `contracts` data changes, it is persisted to `localStorage`
   */
  useEffect(() => {
    localStorage.setContracts(contracts);
  }, [contracts]);

  /**
   * Whenever `contractPacks` data changes, it is persisted to `localStorage`
   */
  useEffect(() => {
    localStorage.setContractPacks(contractPacks);
  }, [contractPacks]);

  return {
    contractPacks,
    fetchContracts,
    fetchContractPacks,
    resetContractPacksInState,
    isLoading,
    setIsLoading,
    contracts,
    addContracts,
    removeContracts,
    addContractsToState,
    removeContractsFromState,
    resetContractsInState,
    error,
    setError,
    retryFunction,
  };
};
