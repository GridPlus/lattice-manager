
export const mockAddresses: LatticeRecord[] = [
  { id: "a", key: "a", val: "a" },
  { id: "b", key: "b", val: "b" },
];

export const mockKvResponse = {
  records: mockAddresses,
  fetched: 5,
  total: 5,
};

/**
 * `getMockClient` returns a mock Client object with a Client object that has its public
 * functions mocked for testing.
 *
 * @param `overrides` key-values that will override any `SDKClient` properties (supersedes `clientOverrides`).
 * @param `clientOverrides` key-values that will override any `Client` properties.
 */
export const getMockClient = (
  { overrides } = {
    overrides: {} as any
  }
): any => ({
  // Addresses
  addKvRecords: jest.fn(async (records) => records),
  getKvRecords: jest.fn(async () => mockKvResponse),
  removeKvRecords: jest.fn(async () => true),
  ...overrides,
});
