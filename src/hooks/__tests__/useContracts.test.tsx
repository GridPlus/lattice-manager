import { waitFor } from "@testing-library/react";
import { act, renderHook } from "@testing-library/react-hooks";
import React from "react";
import { getMockSession, mockContracts } from "../../testUtils/getMockSession";
import { MockProvider } from "../../testUtils/MockProvider";
import localStorage from "../../util/localStorage";
import { useContracts } from "../useContracts";

const renderUseContracts = (overrides?) => {
  const session = getMockSession();
  const { result, rerender, waitForNextUpdate } = renderHook(
    () => useContracts(),
    {
      wrapper: ({ children }) => (
        <MockProvider overrides={{ session, ...overrides }}>
          {children}
        </MockProvider>
      ),
    }
  );
  return { result, rerender, session, waitForNextUpdate };
};

describe("useContracts", () => {
  beforeEach(() => {
    localStorage.removeContracts();
  });

  test("should fetch contracts", async () => {
    const { result } = renderUseContracts();
    expect(result.current.contracts).toStrictEqual([]);
    await act(() => result.current.fetchContracts());
    waitFor(()=>expect(result.current.contracts).toStrictEqual(mockContracts));
  });

  test("should add contracts", async () => {
    const { result } = renderUseContracts();
    await act(() => result.current.addContracts(mockContracts));
    expect(result.current.contracts).toStrictEqual(mockContracts);
  });

  test("should add contracts to state", async () => {
    const { result } = renderUseContracts();
    act(() => result.current.addContractsToState(mockContracts));
    expect(result.current.contracts).toStrictEqual(mockContracts);
  });

  test("should remove contracts", async () => {
    const { result } = renderUseContracts();
    act(() => result.current.addContractsToState(mockContracts));
    expect(result.current.contracts).toStrictEqual(mockContracts);
    await act(() => result.current.removeContracts(mockContracts));
    expect(result.current.contracts).toStrictEqual([]);
  });

  test("should remove contracts from state", async () => {
    const { result } = renderUseContracts();
    act(() => result.current.addContractsToState(mockContracts));
    expect(result.current.contracts).toStrictEqual(mockContracts);
    act(() => result.current.removeContractsFromState(mockContracts));
    expect(result.current.contracts).toStrictEqual([]);
  });
});
