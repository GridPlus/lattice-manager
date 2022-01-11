const Buffer = require('buffer/').Buffer
const { validateBtcAddr } = require('./helpers');

export const allChecks = {
  'ETH': {
    full: checkEth,
    recipient: checkEthRecipient,
    value: checkNumericValue,
  },
  'BTC': {
    full: checkBtc,
    recipient: validateBtcAddr,
    value: checkNumericValue,
  }
}

// Checks for Ethereum transfers (ETH or token)
function checkEth(data) {
  return fullCheck(data, checkEthRecipient);
}

// Checks for Bitcoin transfers
function checkBtc(data) {
  return fullCheck(data, validateBtcAddr);
}

// Perform a check on the recipient and value
// @returns bool -- true if params are both valid
function fullCheck(data, recipientCheck) {
  return true === recipientCheck(data.recipient) && true === checkNumericValue(data.value);
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

function checkNumericValue(value) {
  if (value === '') return false;
  try {
    const num = Number(value);
    return !isNaN(num) && num >= 0;
  } catch (e) {
    return false;
  }
}
