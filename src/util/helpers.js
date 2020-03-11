const constants = {
  HARDENED_OFFSET: 0x80000000,
  ASYNC_SDK_TIMEOUT: 60000,
  SHORT_TIMEOUT: 15000,
  GRIDPLUS_CLOUD_API: 'https://pay.gridplus.io:3000',
  ROOT_STORE: 'gridplus',
  BTC_COIN: 0x80000000,
  BTC_MAIN_GAP_LIMIT: 20,
  BTC_ADDR_BLOCK_LEN: 10,
  BTC_CHANGE_GAP_LIMIT: 1,
  BTC_CHANGE_ADDR_BLOCK_LEN: 1,
  BTC_DEFAULT_FEE_RATE: 5, // 5 sat/byte
  ETH_TX_BASE_URL: 'https://etherscan.io/tx/',
  BTC_TX_BASE_URL: 'https://www.blockchain.com/btc/tx/'
}
if (process.env.REACT_APP_ENV === 'dev') {
    constants.GRIDPLUS_CLOUD_API = 'https://pay.gridplus.io:3333';
    constants.ROOT_STORE = 'gridplus-dev';
    constants.BTC_COIN = 0x80000000 + 1; // Use testnet
    constants.ETH_TX_BASE_URL = 'https://rinkeby.etherscan.io/tx/';
    constants.BTC_TX_BASE_URL = 'https://www.blockchain.com/btctest/tx/';
}
exports.constants = constants;

exports.harden = function(x) {
  return x + constants.HARDENED_OFFSET;
}

// Fetch state data for a set of addresses
// @param currency  {string}   -- abbreviation of the currency (e.g. ETH, BTC)
// @param addresses {object}   -- objecty containing arrays of addresses, indexed by currency
// @param cb        {function} -- callback function of form cb(err, data)
exports.fetchStateData = function(currency, addresses, cb) {
    const reqAddresses = addresses[currency];

    // Exit if we don't have addresses to use in the request
    if (!reqAddresses || reqAddresses.length === 0) 
        return cb(null);

    // Slice out the 'change' portion of the currency name for the request itself
    if (currency.indexOf('_CHANGE') > -1)
        currency = currency.slice(0, currency.indexOf('_CHANGE'));

    // Build the request  
    const data = {
        method: 'POST',
        body: JSON.stringify([{
        currency,
        addresses: reqAddresses,
        }]),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    }
    const url = `${constants.GRIDPLUS_CLOUD_API}/v2/accounts/get-data`
    fetch(url, data)
    .then((response) => response.json())
    .then((resp) => {
        const r = resp.data[0];
        if (r.error) return cb(r.error);
        return cb(null, r);
    })
    .catch((err) => {
        return cb(err);
    });
}

exports.buildBtcTxReq = function(recipient, totalValue, utxos, addrs, changeAddrs, feeRate=constants.BTC_DEFAULT_FEE_RATE) {
    if (!addrs || !changeAddrs || addrs.length < 1 || changeAddrs.length < 1) {
        return { error: 'No addresses (or change addresses). Please wait to sync.' };
    }
    // Determine if these are testnet or mainnet addresses
    const network = addrs[0].slice(0, 1) === '1' || addrs[0].slice(0, 1) === '3' ? 'MAINNET' : 'TESTNET';
    // Determine the change version
    let changeVersion;
    switch (changeAddrs[0].slice(0, 1)) {
        case '1':
            changeVersion = 'LEGACY';
            break;
        case '3':
            changeVersion = 'SEGWIT';
            break;
        case '2':
        case 'm':
        case 'n':
            changeVersion = 'TESTNET';
            break;
        default:
            return { error: 'Unrecognized change address.' };
    }

    // Sort utxos by value
    const sortedUtxos = utxos.sort((a, b) => { return a.value-b.value });
    let sum = 0;
    let numInputs = 0;
    sortedUtxos.forEach((utxo) => {
        if (sum <= totalValue) {
            numInputs += 1;
            sum += utxo.value;
        }
    })

    // Calculate the fee
    let fee = (numInputs+1)*180 + 2*34 + 10;
    
    // If the fee tips us over our total value sum, add another utxo
    if (fee + totalValue < sum) {
        numInputs += 1;
        fee += 180;
    }

    // Build the request inputs
    const BASE_SIGNER_PATH = [constants.HARDENED_OFFSET+44, constants.BTC_COIN, constants.HARDENED_OFFSET];
    const prevOuts = [];
    for (let i = 0; i < numInputs; i++) {
        const utxo = sortedUtxos[i];
        if (addrs.indexOf(utxo.address) > -1) {
            prevOuts.push({
                txHash: utxo.txHash,
                value: utxo.value,
                index: utxo.index,
                signerPath: BASE_SIGNER_PATH.concat([0, addrs.indexOf(utxo.address)]),
            })
        } else if (changeAddrs.indexOf(utxo.address) > -1) {
            prevOuts.push({
                txHash: utxo.txHash,
                value: utxo.value,
                index: utxo.index,
                signerPath: BASE_SIGNER_PATH.concat([1, changeAddrs.indexOf(utxo.address)]),
            })
        } else {
            return { error: 'Failed to find holder of UTXO. Syncing issue likely.' };
        }
    }

    // Return the request (i.e. the whole object)
    const req = {
      prevOuts,
      recipient,
      value: totalValue,
      fee,
      isSegwit: changeVersion === 'SEGWIT',
      // Note we send change to the latest change address. Once this becomes used, the web worker
      // should fetch a new change address and update state
      changePath: BASE_SIGNER_PATH.concat([1, changeAddrs.length -1]),
      changeVersion,
      network,
    };
    return { data: req }
}

