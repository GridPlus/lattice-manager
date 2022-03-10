import differenceBy from "lodash/differenceBy";
import unionBy from "lodash/unionBy";
import { useState } from "react";
import { Record } from "../types/records";

/**
 * `useRecords` is a React hook that builds off of `useState` to add setter functions for
 * interacting with a list:
 *  - `addRecords` - Combines passed in array of records and records in state by comparing ids
 *  - `removeRecords` - Removes passed in array of records from records in state by comparing ids
 * @param defaultValue - any array to set the default value
 */
export const useRecords = (
  defaultValue: Record[], id="id"
): [Record[], (toAdd: Record[]) => void, (toRemove: Record[]) => void] => {
  const [records, setRecords] = useState(defaultValue);

  const addRecords = (recordsToAdd: Record[]) =>
    setRecords((recordsInState) => unionBy(recordsInState, recordsToAdd, id));

  const removeRecords = (recordsToRemove: Record[]) =>
    setRecords((recordsInState) =>
      differenceBy(recordsInState, recordsToRemove, id)
    );

  return [records, addRecords, removeRecords];
};
