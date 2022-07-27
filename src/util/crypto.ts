const ReactCrypto = require("gridplus-react-crypto").default;

export const genPrivKey = (deviceId, password, name) => {
  const key = Buffer.concat([
    Buffer.from(password),
    Buffer.from(deviceId),
    Buffer.from(name),
  ]);
  // Create a new instance of ReactCrypto using the key as entropy
  let crypto = new ReactCrypto(key);
  return crypto.createHash("sha256").update(key).digest();
};