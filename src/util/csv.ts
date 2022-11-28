import Papa from "papaparse";
import { Address } from "../types/records";

export const getAddressKey = (address): string => {
  if (address.Name) return address.Name;
  if (address.name) return address.name;
  if (address.Key) return address.Key;
  if (address.key) return address.key;
  return "";
};

export const getAddressVal = (address): string => {
  if (address.Address) return address.Address;
  if (address.address) return address.address;
  if (address.Val) return address.Val;
  if (address.val) return address.val;
  return "";
};

export const addressTagsToCsvString = (addresses: any[]): string => {
  const addressList = addresses.map((address) => {
    return {
      name: address.key,
      address: address.val,
    };
  });
  return Papa.unparse(addressList);
};

export const csvStringToAddressTags = (text: string): Address[] => {
  const result = Papa.parse(text, {
    header: true,
  });
  return result?.data.map((address) => {
    return {
      key: getAddressKey(address),
      val: getAddressVal(address),
    };
  });
};
