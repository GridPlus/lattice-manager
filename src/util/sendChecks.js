const Buffer = require('buffer/').Buffer

// Checks for Ethereum transfers (ETH or token)
exports.checkEth = function(data) {
  console.log('dta?', data)
  return checkEthRecipient(data.recipient);
}

function checkEthRecipient(recipient) {
  // Make sure there is a 0x prefix
  const isPrefixed = recipient.slice(0, 2) === '0x';
  // Check that the address contains exactly 20 hex bytes.
  // If any of the data is non-hex, the length will be shorter
  const correctLength = Buffer.from(recipient.slice(2), 'hex').length === 20;
  console.log('isPrefixed', isPrefixed, 'correctLength', correctLength)
  return isPrefixed === true && correctLength === true;
}