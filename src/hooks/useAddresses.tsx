import isEmpty from "lodash/isEmpty";
import { useCallback, useContext } from "react";
import { AppContext } from "../store/AppContext";
import { Record } from "../types/records";
import { constants } from "../util/helpers";
import { useRequestFailed } from "./useRequestFailed";
const { ADDRESSES_PER_PAGE } = constants;
const ADDRESS_RECORD_TYPE = 0;

/**
 * The `useAddresses` hook is used to manage the external calls for fetching, adding, and removing
 * key-value address data on the user's Lattice and caching that data in `localStorage`.
 */
export const useAddresses = () => {
  const {
    session,
    isLoadingAddresses,
    setIsLoadingAddresses,
    addresses,
    addAddressesToState,
    removeAddressesFromState,
    resetAddressesInState,
  } = useContext(AppContext);

  const { error, setError, retryFunction, setRetryFunctionWithReset } =
    useRequestFailed();

  /**
   * Fetches the installed addresses from the user's Lattice.
   */
  const fetchAddresses = useCallback(
    async (fetched = 0, retries = 1) => {
      setIsLoadingAddresses(true);

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
            setIsLoadingAddresses(false);
          }
        })
        .catch((err) => {
          if (retries > 0) {
            setError(null);
            fetchAddresses(fetched, retries - 1);
          } else {
            setError(err);
            setIsLoadingAddresses(false);
            setRetryFunctionWithReset(fetchAddresses);
          }
        });
    },
    [
      addAddressesToState,
      session.client,
      setError,
      setIsLoadingAddresses,
      setRetryFunctionWithReset,
    ]
  );

  /**
   * Removes installed addresses from the user's Lattice.
   */
  const removeAddresses = (selectedAddresses: Record[]) => {
    const ids = selectedAddresses.map((r) => parseInt(r.id));
    if (isEmpty(ids)) return;
    setIsLoadingAddresses(true);

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
        setIsLoadingAddresses(false);
      });
  };

  /**
   * Adds new addresses to the user's Lattice.
   */
  const addAddresses = async (addressesToAdd) => {
    setIsLoadingAddresses(true);

    return session.client
      .addKvRecords({
        caseSensitive: false,
        type: ADDRESS_RECORD_TYPE,
        records: addressesToAdd,
      })
      .then(() => {
        // TODO: Remove fetch and call addAddressesToState() with the address data when FW is
        //  updated to return address data. See GitHub issue:
        //  https://github.com/GridPlus/k8x_firmware_production/issues/2323
        fetchAddresses();
      })
      .catch((err) => {
        setError(err);
        setRetryFunctionWithReset(() => addAddresses(addressesToAdd));
        throw err
      })
      .finally(() => {
        setIsLoadingAddresses(false);
      });
  };

  return {
    fetchAddresses,
    addresses,
    addAddresses,
    addAddressesToState,
    removeAddresses,
    removeAddressesFromState,
    resetAddressesInState,
    isLoadingAddresses,
    error,
    setError,
    retryFunction,
  };
};
