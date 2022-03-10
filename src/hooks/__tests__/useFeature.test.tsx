import { act, renderHook } from "@testing-library/react-hooks";
import result from "antd/lib/result";
import SDKSession from "../../sdk/sdkSession";
import { useFeature } from "../useFeature";

describe("useFeature", () => {
  test("should return false if version is too low", () => {
    const session = {
      client: {
        getFwVersion: () => ({
          fix: 0,
          minor: 10,
          major: 5,
        }),
      },
    };
    const {
      result: {
        current: { CAN_VIEW_CONTRACTS },
      },
    } = renderHook(() => useFeature(session));
    expect(CAN_VIEW_CONTRACTS).toBeFalsy();
  });

  test("should return true if version is greater than needed", () => {
    const session = {
      client: {
        getFwVersion: () => ({
          fix: 0,
          minor: 15,
          major: 0,
        }),
      },
    };
    const {
      result: {
        current: { CAN_VIEW_CONTRACTS },
      },
    } = renderHook(() => useFeature(session));
    expect(CAN_VIEW_CONTRACTS).toBeTruthy();
  });
});
