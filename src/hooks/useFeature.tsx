import SDKSession from "../sdk/sdkSession";

/**
 * `useFeature` is a React hook for feature flags that makes it easy to know when a particular
 * feature is active for a version of the Lattice firmware (or other external data).
 */
export const useFeature = ( session: SDKSession): { [key: string]: boolean } => {
  const { fix, minor, major } = session.client.getFwVersion();

  return {
    CAN_VIEW_CONTRACTS: minor >= 14,
  };
};
