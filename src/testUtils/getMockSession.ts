import SDKSession from "../sdk/sdkSession";
import { AddressTag } from "../types/records";
import { ContractRecord } from "./../types/contracts";

export const mockAddressTags: AddressTag[] = [
  { id: "a", key: "a", val: "a" },
  { id: "b", key: "b", val: "b" },
];

export const mockKvResponse = {
  records: mockAddressTags,
  fetched: 5,
  total: 5,
};

export const mockContracts: ContractRecord[] = [
  {
    id: "a",
    header: {
      sig: "0xe8e33700",
      name: "a",
      numParam: 8,
    },
    category: "",
    sig: "0xe8e33700",
    name: "a",
    params: [
      {
        name: "tokenA",
        type: 1,
        latticeTypeIdx: 0,
        isArray: false,
        arraySz: 0,
      },
    ],
  },
  {
    id: "b",
    header: {
      sig: "0x054d50d4",
      name: "b",
      numParam: 3,
    },
    sig: "0x054d50d4",
    name: "b",
    category: "",
    params: [
      {
        name: "amountIn",
        type: 34,
        latticeTypeIdx: 0,
        isArray: false,
        arraySz: 0,
      },
    ],
  },
];

export const mockContractResponse: { records: ContractRecord[] } = {
  records: mockContracts,
};

/**
 * `getMockSession` returns a mock Session object with a Client object that has its public
 * functions mocked for testing.
 *
 * @param `overrides` key-values that will override any `SDKSession` properties (supersedes `clientOverrides`).
 * @param `clientOverrides` key-values that will override any `Client` properties.
 */
export const getMockSession = (
  { overrides, clientOverrides } = {
    overrides: {} as any,
    clientOverrides: {} as any,
  }
): SDKSession => ({
  client: {
    // AddressTags
    addKvRecords: jest.fn(async (records) => records),
    getKvRecords: jest.fn(async () => mockKvResponse),
    removeKvRecords: jest.fn(async () => true),

    //Contracts
    getAbiRecords: jest.fn(async () => mockContractResponse),
    removeAbiRecords: jest.fn(async () => true),
    addAbiDefs: jest.fn(async (defs) => defs),
    ...clientOverrides,
  },
  ...overrides,
});
