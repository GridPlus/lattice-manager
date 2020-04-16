const constants = {
    ENV: 'prod',
    HARDENED_OFFSET: 0x80000000,
    ASYNC_SDK_TIMEOUT: 60000,
    SHORT_TIMEOUT: 10000,
    GRIDPLUS_CLOUD_API: 'https://pay.gridplus.io:3000',
    ROOT_STORE: 'gridplus',
    BTC_COIN: 0x80000000,
    BTC_MAIN_GAP_LIMIT: 20,
    BTC_ADDR_BLOCK_LEN: 10,
    BTC_CHANGE_GAP_LIMIT: 1,
    BTC_CHANGE_ADDR_BLOCK_LEN: 1,
    BTC_DEFAULT_FEE_RATE: 5, // 5 sat/byte
    ETH_TX_BASE_URL: 'https://etherscan.io/tx',
    BTC_TX_BASE_URL: 'https://www.blockchain.com/btc/tx',
    PAGE_SIZE: 20, // 20 transactions per requested page, per `gridplus-cloud-services`
}
if (process.env.REACT_APP_ENV === 'dev') {
    constants.ENV = 'dev';
    constants.GRIDPLUS_CLOUD_API = 'https://pay.gridplus.io:3333';
    constants.ROOT_STORE = 'gridplus-dev';
    constants.BTC_COIN = 0x80000000 + 1; // Use testnet
    constants.ETH_TX_BASE_URL = 'https://rinkeby.etherscan.io/tx';
    constants.BTC_TX_BASE_URL = 'https://www.blockchain.com/btctest/tx';
}
exports.constants = constants;

exports.harden = function(x) {
  return x + constants.HARDENED_OFFSET;
}

const BASE_URL = constants.GRIDPLUS_CLOUD_API;
//-------- GET DATA HELPER
const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
};

function fetchERC20Data(currency, addresses, page) {
    return new Promise((resolve, reject) => {
        if (currency !== 'ETH')
            return resolve(null);
        const url = `${BASE_URL}/v2/accounts/get-erc20-transactions`
        const data = {
            method: 'POST',
            body: JSON.stringify([{ currency, addresses, page }]),
            headers,
        }
        fetch(url, data)
        .then((response) => response.json())
        .then((resp) => {
            const data = resp.data[0];
            if (data.error) return reject(data.error);
            return resolve(data);
        })
        .catch((err) => {
            return reject(err);
        });
    })
}

function fetchCurrencyData(currency, addresses, page) {
    return new Promise((resolve, reject) => {
        // Account for change addresses
        const url = `${BASE_URL}/v2/accounts/get-data`
        const data = {
            method: 'POST',
            body: JSON.stringify([{ currency, addresses, page }]),
            headers,
        }
        // Fetch currency balance and transaction history
        fetch(url, data)
        .then((response) => response.json())
        .then((resp) => {
            const mainData = resp.data[0];
            if (mainData.error) {
                return reject(mainData.error);
            } else {
                return resolve(mainData);
            }
        })
        .catch((err) => {
            return reject(err);
        });
    })
}

// Fetch state data for a set of addresses
// @param currency  {string}   -- abbreviation of the currency (e.g. ETH, BTC)
// @param addresses {object}   -- objecty containing arrays of addresses, indexed by currency
// @param cb        {function} -- callback function of form cb(err, data)
exports.fetchStateData = function(currency, addresses, page, cb) {
    const reqAddresses = addresses[currency];

    // Exit if we don't have addresses to use in the request
    if (!reqAddresses || reqAddresses.length === 0) 
        return cb(null, null);

    // Slice out the 'change' portion of the currency name for the request itself
    let searchCurrency = currency;
    if (currency.indexOf('_CHANGE') > -1)
        searchCurrency = currency.slice(0, currency.indexOf('_CHANGE'));

    const secondaryData = {
        erc20Balances: [],
        transactions: [],
    }

    // Get ERC20 data if applicable
    // We fetch this first because ERC20 transactions will appear as duplicates
    // and we need to filter out the ETH-based dups
    fetchERC20Data(searchCurrency, reqAddresses, page)
    .then((erc20Data) => {
        if (erc20Data !== null && erc20Data !== undefined) {
            // Add ERC20 balances
            secondaryData.erc20Balances = erc20Data.balanceData;
            // Add the transactions
            secondaryData.transactions = secondaryData.transactions.concat(erc20Data.transactions);
        }
        return fetchCurrencyData(searchCurrency, reqAddresses, page)
    })
    .then((mainData) => {
        // Include the CHANGE portion of the currency label if applicable
        mainData.currency = currency;
        // Account for secondary data if applicable
        const allTransactions = secondaryData.transactions.concat(mainData.transactions);
        mainData.erc20Balances = secondaryData.erc20Balances;
        // Remove duplicates. Since the ERC20 transactions came first, they
        // take precedence
        let hashes = [];
        allTransactions.forEach((t, i) => {
            if (hashes.indexOf(t.hash.toLowerCase()) > -1)
                allTransactions.splice(i, 1);
            else
                hashes.push(t.hash.toLowerCase())
        })
        // Now sort the transactions by block height
        allTransactions.transactions = allTransactions.sort((a, b) => {
            return a.height < b.height ? 1 : -1; 
        })
        // Copy the transactions to the full data object
        mainData.transactions = allTransactions.transactions;
        return cb(null, mainData);
    })
    .catch((err) => {
        return cb(err);
    });
}
//-------- END GET DATA

function getBtcVersion(addr) {
    switch (addr.slice(0, 1)) {
        case '1':
            return 'LEGACY';
        case '3':
            return 'SEGWIT';
        case '2':
            return 'TESTNET_SEGWIT';
        case 'm':
        case 'n':
            return 'TESTNET';
        default:
            return null;
    }
}
exports.getBtcVersion = getBtcVersion;

exports.buildBtcTxReq = function(recipient, btcValue, utxos, addrs, changeAddrs, feeRate=constants.BTC_DEFAULT_FEE_RATE) {
    if (!addrs || !changeAddrs || addrs.length < 1 || changeAddrs.length < 1) {
        return { error: 'No addresses (or change addresses). Please wait to sync.' };
    }
    // Convert value to satoshis
    const satValue = Math.round(Number(btcValue) * Math.pow(10, 8));

    // Determine if these are testnet or mainnet addresses
    const network = addrs[0].slice(0, 1) === '1' || addrs[0].slice(0, 1) === '3' ? 'MAINNET' : 'TESTNET';
    // Determine the change version
    const changeVersion = getBtcVersion(changeAddrs);
    if (changeVersion === null)
        return { error: 'Unrecognized change address.' };

    // Sort utxos by value
    const sortedUtxos = utxos.sort((a, b) => { return a.value-b.value });
    let sum = 0;
    let numInputs = 0;
    sortedUtxos.forEach((utxo) => {
        if (sum <= satValue) {
            numInputs += 1;
            sum += utxo.value;
        }
    })

    // Calculate the fee
    let fee = (numInputs+1)*180 + 2*34 + 10;
    // If the fee tips us over our total value sum, add another utxo
    if (fee + satValue > sum) {
        // There's a chance that we just eclipsed the number of inputs we could support.
        // Handle the edge case.
        if (utxos.length <= numInputs)
            return { error: 'Not enough balance to handle network fee. Please send a smaller value.'}
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
            const prevOut = {
                txHash: utxo.txHash,
                value: utxo.value,
                index: utxo.index,
                signerPath: BASE_SIGNER_PATH.concat([1, changeAddrs.indexOf(utxo.address)]),
            };
            prevOuts.push(prevOut);
        } else {
            return { error: 'Failed to find holder of UTXO. Syncing issue likely.' };
        }
    }

    // Return the request (i.e. the whole object)
    const req = {
        prevOuts,
        recipient,
        value: satValue,
        fee,
        isSegwit: changeVersion === 'SEGWIT',
        // Note we send change to the latest change address. Once this becomes used, the web worker
        // should fetch a new change address and update state
        changePath: BASE_SIGNER_PATH.concat([1, changeAddrs.length -1]),
        changeVersion,
        network,
    };
    return { currency: 'BTC', data: req }
}

function leftPad(x, n) {
    let y = '';
    for (let i = 0; i < n - x.length; i++)
        y = `0${y}`;
    return `${y}${x}`;
}

exports.buildERC20Data = function(recipient, value, decimals) {
    const decValue = value * Math.pow(10, decimals);
    const strippedRec = recipient.indexOf('0x') > -1 ? recipient.slice(2) : recipient;
    return `0xa9059cbb${leftPad(strippedRec, 64)}${leftPad(decValue.toString(16), 64)}`;
}