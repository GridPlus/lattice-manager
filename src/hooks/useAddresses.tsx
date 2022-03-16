import isEmpty from "lodash/isEmpty";
import { useCallback, useContext, useEffect, useState } from "react";
import { AppContext } from "../store/AppContext";
import { Record } from "../types/records";
import { constants } from "../util/helpers";
import { useRecords } from "./useRecords";
import { useRequestFailed } from "./useRequestFailed";
import localStorage from "../util/localStorage";
const { ADDRESSES_PER_PAGE } = constants;
const ADDRESS_RECORD_TYPE = 0;

/**
 * The `useAddresses` hook is used to manage the external calls for fetching, adding, and removing
 * key-value address data on the user's Lattice and caching that data in `localStorage`.
 */
export const useAddresses = () => {
  const { session } = useContext(AppContext);

  const [
    addresses,
    addAddressesToState,
    removeAddressesFromState,
    resetAddressesInState,
  ] = useRecords(localStorage.getAddresses() ?? []);

  const { error, setError, retryFunction, setRetryFunctionWithReset } =
    useRequestFailed();

  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetches the installed addresses from the user's Lattice.
   */
  const fetchAddresses = useCallback(
    async (fetched = 0, retries = 1) => {
      setIsLoading(true);

      return session.client
        .getKvRecords({
          start: fetched,
          n: ADDRESSES_PER_PAGE,
        })
        .then((res) => {
          addAddressesToState(res.records);
          const totalFetched = res.fetched + fetched;
          const remainingToFetch = res.total - totalFetched;
          if (remainingToFetch > 0) {
            fetchAddresses(fetched + res.fetched);
          } else {
            setError(null);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (retries > 0) {
            setError(null);
            fetchAddresses(fetched, retries - 1);
          } else {
            setError(err);
            setIsLoading(false);
            setRetryFunctionWithReset(fetchAddresses);
          }
        });
    },
    [
      addAddressesToState,
      session.client,
      setError,
      setIsLoading,
      setRetryFunctionWithReset,
    ]
  );

  /**
   * Removes installed addresses from the user's Lattice.
   */
  const removeAddresses = (selectedAddresses: Record[]) => {
    const ids = selectedAddresses.map((r) => parseInt(r.id));
    if (isEmpty(ids)) return;
    setIsLoading(true);

    return session.client
      .removeKvRecords({ ids })
      .then(() => {
        removeAddressesFromState(selectedAddresses);
        setError(null);
      })
      .catch((err) => {
        setError(err);
        setRetryFunctionWithReset(() => removeAddresses(selectedAddresses));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  /**
   * Installs new addresses to the user's Lattice.
   */
  const addAddresses = async (records: Record[]) => {
    setIsLoading(true);

    return session.client
      .addKvRecords({
        caseSensitive: false,
        type: ADDRESS_RECORD_TYPE,
        records,
      })
      .then(() => {
        addAddressesToState(records);
      })
      .catch((err) => {
        setError(err);
        setRetryFunctionWithReset(() => addAddresses(records));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  /**
   * Whenever `addresses` data changes, it is persisted to `localStorage`
   */
  useEffect(() => {
    localStorage.setAddresses(addresses);
  }, [addresses]);

  return {
    fetchAddresses,
    addresses,
    addAddresses,
    addAddressesToState,
    removeAddresses,
    removeAddressesFromState,
    resetAddressesInState,
    isLoading,
    error,
    setError,
    retryFunction,
  };
};
