const HARDENED_OFFSET = 0x80000000;

exports.harden = function(x) {
  return x + HARDENED_OFFSET;
}