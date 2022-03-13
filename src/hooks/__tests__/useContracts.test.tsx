import { act, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react-hooks";
import React from "react";
import { getMockSession, mockContracts } from "../../testUtils/getMockSession";
import { MockProvider } from "../../testUtils/MockProvider";
import { useContracts } from "../useContracts";

const renderUseContracts = (overrides?) => {
  const session = getMockSession();
  const {
    result: { current },
  } = renderHook(() => useContracts(), {
    wrapper: ({ children }) => (
      <MockProvider overrides={{ session, ...overrides }}>
        {children}
      </MockProvider>
    ),
  });
  return { ...current, session };
};

describe("useContracts", () => {
  test("should fetch contracts", async () => {
    const { fetchContracts, contracts, session } = renderUseContracts();
    await act(() => fetchContracts());
    expect(session.client.getAbiRecords).toHaveBeenCalledTimes(1);
    waitFor(() => expect(contracts).toStrictEqual(mockContracts));
  });

  test("should add contracts", () => {
    const { addContracts, contracts } = renderUseContracts();
    expect(contracts).toStrictEqual([]);
    addContracts(mockContracts);
    waitFor(() => expect(contracts).toStrictEqual(mockContracts));
  });

  test("should add contracts to state", () => {
    const { addContractsToState, contracts } = renderUseContracts();
    expect(contracts).toStrictEqual([]);
    addContractsToState(mockContracts);
    waitFor(() => expect(contracts).toStrictEqual(mockContracts));
  });

  test("should remove contracts", () => {
    const { fetchContracts, removeContracts, contracts } = renderUseContracts();
    expect(contracts).toStrictEqual([]);
    fetchContracts();
    waitFor(() => expect(contracts).toStrictEqual(mockContracts));
    removeContracts(mockContracts.records);
    waitFor(() => expect(contracts).toStrictEqual([]));
  });

  test("should remove contracts from state", () => {
    const { fetchContracts, removeContractsFromState, contracts } =
      renderUseContracts();
    expect(contracts).toStrictEqual([]);
    fetchContracts();
    waitFor(() => expect(contracts).toStrictEqual(mockContracts));
    removeContractsFromState(mockContracts);
    waitFor(() => expect(contracts).toStrictEqual([]));
  });
});
