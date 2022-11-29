import _ from "lodash";
import isEmpty from "lodash/isEmpty";
import { useCallback, useContext } from "react";
import { AppContext } from "../store/AppContext";
import { Address, AddressTag } from "../types/records";
import { constants } from "../util/helpers";
import { sendErrorNotification } from "../util/sendErrorNotification";
const { ADDRESSES_PER_PAGE, ADDRESS_RECORD_TYPE } = constants;

/**
 * The `useAddressTags` hook is used to manage the external calls for fetching, adding, and removing
 * key-value address data on the user's Lattice and caching that data in `store`.
 */
export const useAddressTags = () => {
  const {
    session,
    isLoadingAddressTags,
    setIsLoadingAddressTags,
    addressTags,
    addAddressTagsToState,
    removeAddressTagsFromState,
    resetAddressTagsInState,
  } = useContext(AppContext);

  /**
   * Fetches the installed addresses from the user's Lattice.
   */
  const fetchAddressTags = useCallback(
    async (fetched = 0) => {
      setIsLoadingAddressTags(true);

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
            await fetchAddressTags(fetched + res.fetched);
          }
        })
        .catch((err) => {
          sendErrorNotification({
            ...err,
            onClick: fetchAddressTags,
          });
        })
        .finally(() => {
          setIsLoadingAddressTags(false);
        });
    },
    [addAddressTagsToState, session.client, setIsLoadingAddressTags]
  );

  /**
   * Removes installed addresses from the user's Lattice.
   */
  const removeAddressTags = (selectedAddressTags: AddressTag[]) => {
    const ids = selectedAddressTags.map((r) => parseInt(r.id));
    if (isEmpty(ids)) return;
    setIsLoadingAddressTags(true);

    return session.client
      .removeKvRecords({ ids })
      .then(() => {
        removeAddressTagsFromState(selectedAddressTags);
      })
      .catch((err) => {
        sendErrorNotification({
          ...err,
          onClick: () => removeAddressTags(selectedAddressTags),
        });
      })
      .finally(() => {
        setIsLoadingAddressTags(false);
      });
  };

  /**
   * Adds new addresses to the user's Lattice.
   */
  const addAddressTags = async (addressesToAdd: Address[]) => {
    setIsLoadingAddressTags(true);

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
        const result = await session.client
          .addKvRecords({
            caseSensitive: false,
            type: ADDRESS_RECORD_TYPE,
            records,
          })
          .catch((err) => {
            sendErrorNotification(err);
            reject(err);
          });
        if (result) {
          results.push(result);
        }
      }
      if (results.length) {
        resolve(results);
      } else {
        reject();
      }
    })
      .then(async (newAddrs) => {
        // TODO: Remove fetch and call addAddressTagsToState() with the address data when FW is
        //  updated to return address data. See GitHub issue:
        //  https://github.com/GridPlus/k8x_firmware_production/issues/2323
        await fetchAddressTags();
        return newAddrs;
      })
      .finally(() => {
        setIsLoadingAddressTags(false);
      });
  };

  return {
    addressTags,
    fetchAddressTags,
    addAddressTags,
    removeAddressTags,
    isLoadingAddressTags,
    resetAddressTagsInState,
  };
};
