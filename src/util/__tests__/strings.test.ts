import { abbreviateHash } from './../strings';

describe('strings utilities', () => {
  test('should abbreviate hashes', () => {
    const testStr = "0x758b4684be769e92eefea93f60dda0181ea312da"
    expect(abbreviateHash(testStr)).toBe("0x758b4684...1ea312da")
  });
  test('should handle edge cases', () => {
    expect(abbreviateHash("")).toBe("")
    expect(abbreviateHash(undefined)).toBe("")
    expect(abbreviateHash(null)).toBe("")
  });
});
