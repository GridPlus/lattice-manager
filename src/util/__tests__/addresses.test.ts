import { abbreviateHash, isValidEthAddress } from '../addresses';

describe('address utilities', () => {
  test('abbreviateHash() should abbreviate hashes', () => {
    const testStr = "0x758b4684be769e92eefea93f60dda0181ea312da"
    const testStr2 = "0x758b4684be769e91ea312da"
    expect(abbreviateHash(testStr)).toBe("0x758b4684...1ea312da")
    expect(abbreviateHash(testStr2)).toBe("0x758b4684...1ea312da")
  });
  test('abbreviateHash() should handle edge cases and always return a string', () => {
    expect(abbreviateHash("0x758b4684b9e91ea312da")).toBe("0x758b4684b9e91ea312da") // too short
    expect(abbreviateHash("")).toBe("")
    expect(abbreviateHash(undefined)).toBe("")
    expect(abbreviateHash(null)).toBe("")
  });

  test('isValidEthAddress should return false for invalid ethereum addresses', () => {
    expect(isValidEthAddress("")).toBe(false)
    expect(isValidEthAddress("0x758b4684be769e92e")).toBe(false)
    expect(isValidEthAddress("0x758b4684be769e92eefea93f60dda0181ea31bbz")).toBe(false)
    expect(isValidEthAddress("0x4bd196149561d945411e22851d471f29f8e5e61b5b291b4977df584")).toBe(false)
    expect(isValidEthAddress("Config1111111111111111111111111111111111111")).toBe(false)
    //@ts-expect-error - testing bad inputs
    expect(isValidEthAddress(0)).toBe(false)
    //@ts-expect-error - testing bad inputs
    expect(isValidEthAddress({test: "0x758b4684be769e92eefea93f60dda0181ea31bbb"})).toBe(false)
  })

  test('isValidEthAddress should return true for valid ethereum addresses', () => {
    expect(isValidEthAddress("0x758b4684be769e92eefea93f60dda0181ea31bbb")).toBe(true)
   })
});