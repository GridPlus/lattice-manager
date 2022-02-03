import { act, renderHook } from "@testing-library/react-hooks";
import { useRecords } from "../useRecords";

describe("useRecords", () => {
  test("should add/remove records", () => {
    const { result } = renderHook(() => useRecords([]));
    const records = () => result.current[0];
    const addRecords = result.current[1];
    const removeRecords = result.current[2];
    act(() => {
      addRecords([{ id: "a", val: "a" }]);
    });
    expect(records()).toStrictEqual([{ id: "a", val: "a" }]);
    act(() => {
      removeRecords([{ id: "a", val: "a" }]);
    });
    expect(records()).toStrictEqual([]);
  });

  test("should avoid record conflicts by id", () => {
    const { result } = renderHook(() => useRecords([]));
    const records = () => result.current[0];
    const addRecords = result.current[1];
    const removeRecords = result.current[2];
    act(() => {
      addRecords([{ id: "a", val: "a" }]);
    });
    act(() => {
      addRecords([{ id: "a", val: "a" }]);
    });
    expect(records()).toStrictEqual([{ id: "a", val: "a" }]);
    act(() => {
      removeRecords([{ id: "a", val: "a" }]);
    });
    expect(records()).toStrictEqual([]);
  });
});
