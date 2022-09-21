/**
 * `useFeatureFlag` is a React hook for feature flags that makes it easy to know when a particular
 * feature is active or not.
 *
 * To add a feature, add a SNAKE_CASE key to the `features` variable with a value that specifies if
 * it's active or not.
 */
export const useFeatureFlag = (): { [feature: string]: boolean } => {
  const features = {
    CAN_IMPORT_EXPORT_TAGS: true,
  };

  return features
};
