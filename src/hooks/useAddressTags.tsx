import _ from "lodash";
import isEmpty from "lodash/isEmpty";
import { useCallback, useContext } from "react";
import SDKSession from "../sdk/sdkSession";
import { AppContext } from "../store/AppContext";
import { Address, LatticeRecord } from "../types/records";
import { constants } from "../util/helpers";
import { sendErrorNotification } from "../util/sendErrorNotification";
const { ADDRESSES_PER_PAGE, ADDRESS_RECORD_TYPE } = constants;

/**
 * The `useAddresses` hook is used to manage the external calls for fetching, adding, and removing
 * key-value address data on the user's Lattice and caching that data in `store`.
 */
export const useAddressTags = () => {
  const {
    session,
    isLoadingAddressTags,
    setIsLoadingAddresses,
    addressTags,
    addAddressTagsToState,
    removeAddressTagsFromState,
    resetAddressTagsInState,
  }: {
    session: SDKSession;
    isLoadingAddressTags: boolean;
    setIsLoadingAddresses: (isLoading: boolean) => void;
    addressTags: LatticeRecord[];
    addAddressTagsToState: (addressTags: LatticeRecord[]) => void;
    removeAddressTagsFromState: (addressTags: LatticeRecord[]) => void;
    resetAddressTagsInState: () => void;
  } = useContext(AppContext);

  /**
   * Fetches the installed addresses from the user's Lattice.
   */
  const fetchAddresses = useCallback(
    async (fetched = 0) => {
      setIsLoadingAddresses(true);

      return session.client
        .getKvRecords({
          start: fetched,
          n: ADDRESSES_PER_PAGE,
        })
        .then(async (res) => {
          addAddressTagsToState(res.records);
          const totalFetched = res.fetched + fetched;
          const remainingToFetch = res.total - totalFetched;
          if (remainingToFetch > 0) {
            await fetchAddresses(fetched + res.fetched);
          }
        })
        .catch((err) => {
          sendErrorNotification({
            ...err,
            onClick: fetchAddresses,
          });
        })
        .finally(() => {
          setIsLoadingAddresses(false);
        });
    },
    [addAddressTagsToState, session.client, setIsLoadingAddresses]
  );

  /**
   * Removes installed addresses from the user's Lattice.
   */
  const removeAddresses = (selectedAddresses: LatticeRecord[]) => {
    const ids = selectedAddresses.map((r) => parseInt(r.id));
    if (isEmpty(ids)) return;
    setIsLoadingAddresses(true);

    return session.client
      .removeKvRecords({ ids })
      .then(() => {
        removeAddressTagsFromState(selectedAddresses);
      })
      .catch((err) => {
        sendErrorNotification({
          ...err,
          onClick: () => removeAddresses(selectedAddresses),
        });
      })
      .finally(() => {
        setIsLoadingAddresses(false);
      });
  };

  /**
   * Adds new addresses to the user's Lattice.
   */
  const addAddresses = async (addressesToAdd: Address[]) => {
    setIsLoadingAddresses(true);

    /**
     * Transform `addressesToAdd` data into chunks of size `ADDRESSES_PER_PAGE` with shape `{ key:
     * val }` for sending to Lattice because the Lattice can only handle a particular amount of
     * addresses at a time.
     */
    const recordsList = _.chain(addressesToAdd)
      .chunk(ADDRESSES_PER_PAGE)
      .map((addrChunk) =>
        _.chain(addrChunk).keyBy("key").mapValues("val").value()
      )
      .value();

    return new Promise<Buffer[]>(async (resolve, reject) => {
      let results = [];
      for await (const records of recordsList) {
        const buf = await session.client
          .addKvRecords({
            caseSensitive: false,
            type: ADDRESS_RECORD_TYPE,
            records,
          })
          .catch((err) => {
            sendErrorNotification(err);
            reject(err);
          });
          if(buf) results.push(buf);

      }
      console.log({ results });
      if (results.length) {
        resolve(results);
      } else {
        reject();
      }
    })
      .then(async (newAddrs) => {
        // TODO: Remove fetch and call addAddressesToState() with the address data when FW is
        //  updated to return address data. See GitHub issue:
        //  https://github.com/GridPlus/k8x_firmware_production/issues/2323
        await fetchAddresses();
        return newAddrs
      })
      .finally(() => {
        setIsLoadingAddresses(false);
      });
  };

  return {
    addressTags,
    fetchAddresses,
    addAddresses,
    removeAddresses,
    isLoadingAddressTags,
    resetAddressTagsInState,
  };
};
