const bs58check = require('bs58check');
const { ethers } = require('ethers');
const constants = {
    DEFAULT_APP_NAME: 'GridPlus Web Wallet',
    ENV: process.env.REACT_APP_ENV || 'prod',
    BASE_SIGNING_URL: process.env.REACT_APP_BASE_SIGNING_URL || 'https://signing.gridpl.us',
    GRIDPLUS_CLOUD_API: process.env.REACT_APP_GRIDPLUS_CLOUD_API || 'https://pay.gridplus.io:3000',
    ROOT_STORE: process.env.REACT_APP_ROOT_STORE || 'gridplus',
    HARDENED_OFFSET: 0x80000000,
    ASYNC_SDK_TIMEOUT: 60000,
    SHORT_TIMEOUT: 30000,
    BTC_COIN: parseInt(process.env.REACT_APP_BTC_COIN) || 0x80000000,
    BTC_MAIN_GAP_LIMIT: 20,
    BTC_ADDR_BLOCK_LEN: 10,
    BTC_CHANGE_GAP_LIMIT: 1,
    BTC_CHANGE_ADDR_BLOCK_LEN: 1,
    BTC_DEFAULT_FEE_RATE: process.env.REACT_APP_BTC_DEFAULT_FEE_RATE || 5, // 5 sat/byte
    ETH_DEFAULT_FEE_RATE: process.env.REACT_APP_ETH_DEFAULT_FEE_RATE || 20, //  20 GWei
    ETH_TX_BASE_URL: process.env.REACT_APP_ETH_TX_BASE_URL || 'https://etherscan.io/tx',
    BTC_TX_BASE_URL: process.env.REACT_APP_BTC_TX_BASE_URL || 'https://www.blockchain.com/btc/tx',
    PAGE_SIZE: 20, // 20 transactions per requested page, per `gridplus-cloud-services`
    LOST_PAIRING_ERR: "NOT_PAIRED",
    LOST_PAIRING_MSG: "Cannot find Lattice connection. Please re-connect.",
    ERC20_TOKENS_LIST_PATH: process.env.REACT_APP_ERC20_TOKENS_LIST_PATH || './prodTokens.json',
    ETH_TESTNET: process.env.REACT_APP_ETH_TESTNET || null,
    BTC_TESTNET: process.env.REACT_APP_BTC_TESTNET || null,
    KEYRING_LOGOUT_MS: process.env.KEYRING_LOGOUT_MS || 2592000000, // default 30 days
    KEYRING_DATA_PATH: 'gridplus_web_wallet_keyring_logins', // item in localStorage
}

constants.ERC20_TOKENS = constants.ENV === 'dev' ? require('./devTokens.json') : require('./prodTokens.json');
constants.BIP44_PURPOSE = constants.HARDENED_OFFSET + 44;
// NOTE: For v1, the Lattice only supports p2sh-p2wpkh addresses, which
//       use the BIP49 purpose (49') in their derivation paths.
constants.BIP_PURPOSE_P2SH_P2WPKH = constants.HARDENED_OFFSET + 49;
exports.constants = constants;

//--------------------------------------------
// ETHEREUM NAME SERVICE (ENS) HELPERS
//--------------------------------------------
let ethersProvider;
exports.setEthersProvider = function() {
    try {
        if (constants.ETH_TESTNET)
            ethersProvider = new ethers.providers.EtherscanProvider(constants.ETH_TESTNET.toLowerCase());
        else
            ethersProvider = new ethers.providers.EtherscanProvider();
        return null;
    } catch (err) {
        return err;
    }
}

function isValidENS(name) {
    try {
        return name.slice(-4) === '.eth';
    } catch (err) {
        return false;
    }
}
exports.isValidENS = isValidENS;

exports.resolveENS = function(name, cb) {
    if (false === isValidENS(name))
        return cb(null, null);
    ethersProvider.resolveName(name)
    .then((addr) => { return cb(null, addr); })
    .catch((err) => { return cb(err); })
}
//--------------------------------------------
// END ETHEREUM NAME SERVICE (ENS) HELPERS
//--------------------------------------------

//--------------------------------------------
// CHAIN DATA SYNCING HELPERS
//--------------------------------------------
const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
};

function fetchETHNonce(currency, addresses) {
    return new Promise((resolve, reject) => {
        if (currency !== 'ETH' || addresses.length < 1)
            return resolve(null);
        const url = `${constants.GRIDPLUS_CLOUD_API}/v2/accounts/get-transaction-count`
        const data = {
            method: 'POST',
            body: JSON.stringify({ address: addresses[0] }),
            headers,
        }
        fetch(url, data)
        .then((response) => response.json())
        .then((resp) => {
            if (resp.error) return reject(resp.error);
            return resolve(resp.data);
        })
        .catch((err) => {
            return reject('Failed to fetch data. Please refresh to try again.');
        });
    })
}

function fetchERC20Data(currency, addresses, page) {
    return new Promise((resolve, reject) => {
        if (currency !== 'ETH')
            return resolve(null);
        const url = `${constants.GRIDPLUS_CLOUD_API}/v2/accounts/get-erc20-transactions`
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
            return reject('Failed to fetch data. Please refresh to try again.');
        });
    })
}

function fetchCurrencyData(currency, addresses, page) {
    return new Promise((resolve, reject) => {
        // Account for change addresses
        const url = `${constants.GRIDPLUS_CLOUD_API}/v2/accounts/get-data`
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
            return reject('Failed to fetch data. Please refresh to try again.');
        });
    })
}

// Fetch state data for a set of addresses
// @param currency  {string}   -- abbreviation of the currency (e.g. ETH, BTC)
// @param addresses {object}   -- objecty containing arrays of addresses, indexed by currency
// @param page      {number}   -- page of transactions to request (ignored if currency!=ETH)
// @param cb        {function} -- callback function of form cb(err, data)
exports.fetchStateData = function(currency, addresses, page, cb) {
    // We will combine regular and change addresses for the UTXO-based coins.
    // This function will get called for each currency type, which means the requester
    // will naively be asking for data on the change addresses by themselves. We should
    // just return when that request is made.
    if (currency.indexOf('_CHANGE') > -1)
        return cb(null);
    
    // Get the initial addresses
    let reqAddresses = addresses[currency];
    if (addresses[`${currency}_CHANGE`] && addresses[`${currency}_CHANGE`].length > 0)
        reqAddresses = reqAddresses.concat(addresses[`${currency}_CHANGE`])

    // Exit if we don't have addresses to use in the request
    if (!reqAddresses || reqAddresses.length === 0) 
        return cb(null);


    let stateData = {
        currency,
        transactions: [], // ETH + ERC20 transactions
        balance: {}, // ETH balance
        erc20Balances: [], // ERC20 balances
        ethNonce: null,
        utxos: [],
    };

    // Get ERC20 data if applicable
    // We fetch this first because ERC20 transactions will appear as duplicates
    // and we need to filter out the ETH-based dups
    fetchETHNonce(currency, reqAddresses)
    .then((nonce) => {
        if (nonce !== null)
            stateData.ethNonce = nonce;
        return fetchERC20Data(currency, reqAddresses, page)
    })        
    .then((erc20Data) => {
        if (erc20Data !== null && erc20Data !== undefined) {
            // Add ERC20 balances
            stateData.erc20Balances = erc20Data.balanceData;
            // Add the transactions
            stateData.transactions = stateData.transactions.concat(erc20Data.transactions);
        }
        return fetchCurrencyData(currency, reqAddresses, page)
    })
    .then((mainData) => {
        stateData.currency = mainData.currency;
        stateData.balance = mainData.balance;
        stateData.transactions = stateData.transactions.concat(mainData.transactions);
        stateData.utxos = mainData.utxos || [];
        stateData.firstUnused = mainData.firstUnused;
        stateData.lastUnused = mainData.lastUnused;

        // Remove duplicates. Since the ERC20 transactions came first, they
        // take precedence
        let hashes = [];
        stateData.transactions.forEach((t, i) => {
            if (hashes.indexOf(t.hash.toLowerCase()) > -1)
                stateData.transactions.splice(i, 1);
            else
                hashes.push(t.hash.toLowerCase())
        })
        // Now sort the transactions by block height
        stateData.transactions = stateData.transactions.sort((a, b) => {
            return a.height < b.height ? 1 : -1; 
        })
        return cb(null, stateData);
    })
    .catch((err) => {
        return cb(err);
    });
}
//--------------------------------------------
// END CHAIN DATA SYNCING HELPERS
//--------------------------------------------

//--------------------------------------------
// OTHER HELPERS
//--------------------------------------------
exports.harden = function(x) {
  return x + constants.HARDENED_OFFSET;
}

function getBtcVersion(addrs) {
    const addr = Array.isArray(addrs) ? addrs[0] : addrs;
    switch (addr.slice(0, 1)) {
        case '1':
            return 'LEGACY';
        case '3':
            return 'SEGWIT';
        case '2':
            return 'SEGWIT_TESTNET';
        case 'm':
        case 'n':
            return 'TESTNET';
        default:
            return null;
    }
}
exports.getBtcVersion = getBtcVersion;

function getBtcNumTxBytes(numInputs) {
    return (numInputs+1)*180 + 2*34 + 10;
}
exports.getBtcNumTxBytes = getBtcNumTxBytes;

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
    let bytesUsed = getBtcNumTxBytes(numInputs);
    // If the fee tips us over our total value sum, add another utxo
    if ((bytesUsed * feeRate) + satValue > sum) {
        // There's a chance that we just eclipsed the number of inputs we could support.
        // Handle the edge case.
        if (utxos.length <= numInputs)
            return { error: 'Not enough balance to handle network fee. Please send a smaller value.'}
        numInputs += 1;
        bytesUsed += 180;
    }
    const fee = Math.floor(bytesUsed * feeRate);

    // Build the request inputs
    const BASE_SIGNER_PATH = [constants.BIP_PURPOSE_P2SH_P2WPKH, constants.BTC_COIN, constants.HARDENED_OFFSET];
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
        isSegwit: changeVersion === 'SEGWIT' || changeVersion === 'SEGWIT_TESTNET',
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

exports.getCurrencyText = function(currency) {
    if (constants.ENV === 'dev') {
      switch (currency) {
        case 'ETH':
          return `ETH (${constants.ETH_TESTNET})`;
        case 'BTC':
          return `BTC (${constants.BTC_TESTNET})`;
        default:
          return;
      }
    }
    return currency;
}

exports.validateBtcAddr = function(addr) {
    if (addr === '') return null;
    try {
        bs58check.decode(addr);
        return true;
    } catch (e) {
        return false;
    }
}

exports.toHexStr = function(bn) {
    const s = bn.toString(16);
    const base = s.length % 2 === 0 ? s : `0${s}`;
    return `0x${base}`; 
}
//--------------------------------------------
// END OTHER HELPERS
//--------------------------------------------