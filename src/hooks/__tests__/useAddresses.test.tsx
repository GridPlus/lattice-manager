import { act, renderHook } from "@testing-library/react";
import store from "../../store/persistanceStore";
import { getMockClient, mockAddresses } from "../../testUtils/getMockClient";
import { MockAppProvider } from "../../testUtils/MockProvider";
import { useAddresses } from "../useAddresses";

const renderUseAddresses = (overrides?) => {
  const client = getMockClient();
  const { result } = renderHook(() => useAddresses(), {
    wrapper: ({ children }) => (
      <MockAppProvider overrides={{ client, ...overrides }}>
        {children}
      </MockAppProvider>
    ),
  });
  return { result, client };
};

describe("useAddresses", () => {
  beforeEach(() => {
    store.removeAddresses();
  });

  test("should fetch addresses", async () => {
    const { result } = renderUseAddresses();
    expect(result.current.addresses).toStrictEqual([]);
    await act(() => result.current.fetchAddresses());
    expect(result.current.addresses).toStrictEqual(mockAddresses);
  });

  test("should add addresses", async () => {
    const { result } = renderUseAddresses();
    await act(() => result.current.addAddresses(mockAddresses));
    expect(result.current.addresses).toStrictEqual(mockAddresses);
  });

  test("should add addresses to state", async () => {
    const { result } = renderUseAddresses();
    act(() => result.current.addAddressesToState(mockAddresses));
    expect(result.current.addresses).toStrictEqual(mockAddresses);
  });

  test("should remove addresses", async () => {
    const { result } = renderUseAddresses();
    act(() => result.current.addAddressesToState(mockAddresses));
    expect(result.current.addresses).toStrictEqual(mockAddresses);
    await act(() => result.current.removeAddresses(mockAddresses));
    expect(result.current.addresses).toStrictEqual([]);
  });

  test("should remove addresses from state", async () => {
    const { result } = renderUseAddresses();
    act(() => result.current.addAddressesToState(mockAddresses));
    expect(result.current.addresses).toStrictEqual(mockAddresses);
    act(() => result.current.removeAddressesFromState(mockAddresses));
    expect(result.current.addresses).toStrictEqual([]);
  });
});
