import { abbreviateHash } from '../addresses';

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
});