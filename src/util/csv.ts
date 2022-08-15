import Papa from "papaparse";
import { Address } from "../types/records";

export const addressesToCsvString = (addresses: Address[]): string => Papa.unparse(
  addresses.map((address) => ({ key: address.key, val: address.val }))
);

export const csvStringToAddresses = (text: string): Address[] => {
  const result = Papa.parse(text, {
    header: true,
  })
  return result?.data
}