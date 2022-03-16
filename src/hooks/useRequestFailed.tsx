import { useCallback, useState } from "react";

/**
 * The `useRequestFailed` hook is used to more easily manage the state of a request as it is loading,
 * responding with errors, or retrying.
 */
export const useRequestFailed = () => {
  const [error, setError] = useState(undefined);
  const [retryFunction, setRetryFunction] = useState(undefined);

  /**
   * Wraps the `retryFunction` in another function that will not only call the `retryFunction` but
   * also reset the state of the `error` and `retryFunction` variables.
   */
  const setRetryFunctionWithReset = useCallback(
    (func) =>
      setRetryFunction(() => () => {
        func();
        setError(null);
        setRetryFunction(null);
      }),
    [setRetryFunction]
  );

  return {
    error,
    setError,
    retryFunction,
    setRetryFunction,
    setRetryFunctionWithReset,
  };
};
