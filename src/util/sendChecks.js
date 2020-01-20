const Buffer = require('buffer/').Buffer

exports.allChecks = {
  'ETH': {
    full: checkEth,
    recipient: checkEthRecipient,
    value: checkEthValue,
  }
}

// Checks for Ethereum transfers (ETH or token)
function checkEth(data) {
  const checks = {
    recipient: null,
    value: null,
  }
  // Individual checks
  if (data.recipient.value) checks.recipient = checkEthRecipient(data.recipient)
  if (data.value.value) checks.value = checkEthValue(data.value);

  // Return summary
  return checks;
}

function checkEthRecipient(recipient) {
  if (recipient === '') return null;
  try {
    // Make sure there is a 0x prefix
    const isPrefixed = recipient.slice(0, 2) === '0x';
    // Check that the address contains exactly 20 hex bytes.
    // If any of the data is non-hex, the length will be shorter
    const correctLength = Buffer.from(recipient.slice(2), 'hex').length === 20;
    return isPrefixed === true && correctLength === true;
  } catch (e) {
    return false;
  }
}

function checkEthValue(value) {
  if (value === '') return null;
  try {
    const num = Number(value);
    return !isNaN(num);
  } catch (e) {
    return false;
  }
}
