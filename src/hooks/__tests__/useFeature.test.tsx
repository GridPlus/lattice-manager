import { renderHook } from "@testing-library/react";
import React from "react";
import { MockAppProvider } from "../../testUtils/MockProvider";
import { useFeature } from "../useFeature";

const renderUseFeature = ([fix, minor, major], overrides?): any => {
  const client = {
    getFwVersion: () => ({ fix, minor, major }),
  };
  const {
    result: { current },
  } = renderHook(() => useFeature(), {
    wrapper: ({ children }) => (
      <MockAppProvider overrides={{ client, ...overrides }}>
        {children}
      </MockAppProvider>
    ),
  });
  return { ...current, client };
};

describe("useFeature", () => {
  test("should return false if version is too low", () => {
    const { CAN_VIEW_CONTRACTS } = renderUseFeature([0, 10, 5]);
    expect(CAN_VIEW_CONTRACTS).toBeFalsy();
  });

  test("should return true if version is greater than needed", () => {
    const { CAN_VIEW_CONTRACTS } = renderUseFeature([0, 15, 0]);
    expect(CAN_VIEW_CONTRACTS).toBeTruthy();
  });
});
