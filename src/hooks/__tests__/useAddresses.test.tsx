import { act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import React from "react";
import { getMockSession, mockAddresses } from "../../testUtils/getMockSession";
import { MockProvider } from "../../testUtils/MockProvider";
import localStorage from "../../util/localStorage";
import { useAddresses } from "../useAddressTags";

const renderUseAddresses = (overrides?) => {
  const session = getMockSession();
  const { result } = renderHook(() => useAddresses(), {
    wrapper: ({ children }) => (
      <MockProvider overrides={{ session, ...overrides }}>
        {children}
      </MockProvider>
    ),
  });
  return { result, session };
};

describe("useAddresses", () => {
  beforeEach(() => {
    localStorage.removeAddresses();
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
