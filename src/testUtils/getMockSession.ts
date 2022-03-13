import SDKSession from "../sdk/sdkSession";
import { Record } from "../types/records";

export const mockAddresses: Record[] = [
  { id: "a", key: "a", val: "a" },
  { id: "b", key: "b", val: "b" },
];

export const mockKvResponse = {
  records: mockAddresses,
  fetched: 5,
  total: 5,
};

export const mockContracts = {
  records: [
    {
      id: "a",
      header: {
        sig: "0xe8e33700",
        name: "a",
        numParam: 8,
      },
      category: "",
      params: [
        {
          name: "tokenA",
          type: 1,
          typeName: "address",
          isArray: 0,
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
      category: "",
      params: [
        {
          name: "amountIn",
          type: 34,
          typeName: "uint256",
          isArray: 0,
          arraySz: 0,
        },
      ],
    },
  ],
};

/**
 * `getMockSession` returns a mock Session object with a mocked Client object that has its public
 * functions mocked for testing.
 *
 * @param `overrides` key-values that will override any values (supersedes `clientOverrides`)
 * @param `clientOverrides`: key-values that will override any `Client` values
 */
export const getMockSession = (
  { overrides, clientOverrides } = {
    overrides: {} as any,
    clientOverrides: {} as any,
  }
): SDKSession => ({
  client: {
    addKvRecords: jest.fn(async (records) => records),
    getKvRecords: jest.fn(async () => mockKvResponse),
    removeKvRecords: jest.fn(async () => true),
    getAbiRecords: jest.fn(async () => mockContracts),
    removeAbiRecords: jest.fn(async () => true),
    addAbiDefs: jest.fn(async (defs) => defs),
    ...clientOverrides,
  },
  ...overrides,
});
