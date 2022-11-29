import differenceBy from "lodash/differenceBy";
import unionBy from "lodash/unionBy";
import { useState } from "react";
import { AddressTag } from "../types/records";

/**
 * `useRecords` is a React hook that builds off of `useState` to add setter functions for
 * interacting with a list of objects:
 *  - `addRecords` - Combines passed in array of records and records in state by comparing ids
 *  - `removeRecords` - Removes passed in array of records from records in state by comparing ids
 * @param defaultValue - any array to set the default value
 */
export const useRecords = <T extends AddressTag>(
  defaultValue: T[],
  id = "id"
): [T[], (toAdd: T[]) => void, (toRemove: T[]) => void, () => void] => {
  const [records, setRecords] = useState<T[]>(defaultValue);

  const addRecords = (recordsToAdd: T[]) =>
    setRecords((recordsInState) => unionBy(recordsInState, recordsToAdd, id));

  const removeRecords = (recordsToRemove: T[]) =>
    setRecords((recordsInState) =>
      differenceBy(recordsInState, recordsToRemove, id)
    );

  const resetRecords = () => setRecords([]);

  return [records, addRecords, removeRecords, resetRecords];
};
