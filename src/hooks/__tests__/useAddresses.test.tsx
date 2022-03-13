import { act, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react-hooks";
import React from "react";
import { getMockSession, mockAddresses } from "../../testUtils/getMockSession";
import { MockProvider } from "../../testUtils/MockProvider";
import { useAddresses } from "../useAddresses";

const renderUseAddresses = (overrides?) => {
  const session = getMockSession();
  const {
    result: { current },
  } = renderHook(() => useAddresses(), {
    wrapper: ({ children }) => (
      <MockProvider overrides={{ session, ...overrides }}>
        {children}
      </MockProvider>
    ),
  });
  return { ...current, session };
};

describe("useAddresses", () => {
  test("should fetch addresses", async () => {
    const { fetchAddresses, addresses, session } = renderUseAddresses();
    await act(() => fetchAddresses());
    expect(session.client.getKvRecords).toHaveBeenCalledTimes(1);
    waitFor(() => expect(addresses).toStrictEqual(mockAddresses));
  });

  test("should add addresses", () => {
    const { addAddresses, addresses } = renderUseAddresses();
    expect(addresses).toStrictEqual([]);
    addAddresses(mockAddresses);
    waitFor(() => expect(addresses).toStrictEqual(mockAddresses));
  });

  test("should add addresses to state", () => {
    const { addAddressesToState, addresses } = renderUseAddresses();
    expect(addresses).toStrictEqual([]);
    addAddressesToState(mockAddresses);
    waitFor(() => expect(addresses).toStrictEqual(mockAddresses));
  });

  test("should remove addresses", () => {
    const { fetchAddresses, removeAddresses, addresses } = renderUseAddresses();
    expect(addresses).toStrictEqual([]);
    fetchAddresses();
    waitFor(() => expect(addresses).toStrictEqual(mockAddresses));
    removeAddresses(mockAddresses);
    waitFor(() => expect(addresses).toStrictEqual([]));
  });

  test("should remove addresses from state", () => {
    const { fetchAddresses, removeAddressesFromState, addresses } =
      renderUseAddresses();
    expect(addresses).toStrictEqual([]);
    fetchAddresses();
    waitFor(() => expect(addresses).toStrictEqual(mockAddresses));
    removeAddressesFromState(mockAddresses);
    waitFor(() => expect(addresses).toStrictEqual([]));
  });
});
