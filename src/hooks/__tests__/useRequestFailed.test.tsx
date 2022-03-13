import { waitFor } from "@testing-library/react";
import { act, renderHook } from "@testing-library/react-hooks";
import { useRequestFailed } from "../useRequestFailed";

const renderUseRequestFailed = () => {
  const {
    result: { current },
  } = renderHook(() => useRequestFailed());
  return current;
};
describe("useRequestFailed", () => {
  test("should reset retry function", () => {
    const { retryFunction, setRetryFunctionWithReset } =
      renderUseRequestFailed();
    const mockFn = jest.fn();

    act(() => setRetryFunctionWithReset(mockFn));
    waitFor(() => expect(retryFunction).toBeTruthy());

    act(() => mockFn());
    waitFor(() => expect(retryFunction).toBeFalsy());
  });

  test("should reset error", () => {
    const { error, setError, setRetryFunctionWithReset } =
      renderUseRequestFailed();
    const mockFn = jest.fn();
    const mockErr = "error";

    act(() => setRetryFunctionWithReset(mockFn));

    act(() => setError(mockErr));
    waitFor(() => expect(error).toBe(mockErr));

    act(() => mockFn());
    waitFor(() => expect(error).toBeFalsy());
  });
});
