/**
 * `abbreviateHash` takes a string and returns the first 10 and last 8 characters with an ellipsis between.
 * @param {string} hash - the hash string to shorten.
 */
export const abbreviateHash = (hash: string) =>
  hash && hash.length > 24
    ? `${hash.slice(0, 10)}...${hash.slice(hash.length - 8, hash.length)}`
    : hash ?? "";
