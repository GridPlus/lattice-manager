const bs58check = require('bs58check');
const bech32 = require('bech32').bech32;

const constants = {
    DEFAULT_APP_NAME: 'Lattice Manager',
    ENV: process.env.REACT_APP_ENV || 'prod',
    BASE_SIGNING_URL: process.env.REACT_APP_BASE_SIGNING_URL || 'https://signing.gridpl.us',
    GRIDPLUS_CLOUD_API: process.env.REACT_APP_GRIDPLUS_CLOUD_API || 'https://pay.gridplus.io:3000',
    BTC_PROD_DATA_API: 'https://blockchain.info',
    ROOT_STORE: process.env.REACT_APP_ROOT_STORE || 'gridplus',
    HARDENED_OFFSET: 0x80000000,
    ASYNC_SDK_TIMEOUT: 60000,
    SHORT_TIMEOUT: 30000,
    BTC_COIN: parseInt(process.env.REACT_APP_BTC_COIN) || 0x80000000,
    SATS_TO_BTC: Math.pow(10, 8),
    BTC_MAIN_GAP_LIMIT: 20,
    BTC_CHANGE_GAP_LIMIT: 1,
    BTC_ADDR_BLOCK_LEN: 10,
    BTC_CHANGE_ADDR_BLOCK_LEN: 1,
    BTC_DEFAULT_FEE_RATE: process.env.REACT_APP_BTC_DEFAULT_FEE_RATE || 10, // 10 sat/byte
    BTC_TX_BASE_URL: process.env.REACT_APP_BTC_TX_BASE_URL || 'https://www.blockchain.com/btc/tx',
    PAGE_SIZE: 20, // 20 transactions per requested page, per `gridplus-cloud-services`
    LOST_PAIRING_ERR: "NOT_PAIRED",
    LOST_PAIRING_MSG: "Cannot find Lattice connection. Please re-connect.",
    BTC_TESTNET: process.env.REACT_APP_BTC_TESTNET || null,
    KEYRING_LOGOUT_MS: process.env.KEYRING_LOGOUT_MS || 2592000000, // default 30 days
    KEYRING_DATA_PATH: 'gridplus_web_wallet_keyring_logins', // item in localStorage
    AWS_BUCKET_URL: 'https://gridplus-public.s3.amazonaws.com',
    LATTICE_CERT_SIGNER: process.env.REACT_APP_LATTICE_CERT_SIGNER || '0477816e8e83bb17c4309cc2e5aa134c573a5943154940095a423149f7cc0384ad52d33f1b4cd89c967bf211c039202df3a7899cb7543de4738c96a81cfde4b117',
    CONTRACTS_HELP_LINK: 'https://docs.gridplus.io/gridplus-web-wallet/use-ethereum-smart-contract-abi-function-definitions',
    TAGS_HELP_LINK: 'https://docs.gridplus.io/gridplus-web-wallet/address-tags',
    PERMISSIONS_HELP_LINK: 'https://docs.gridplus.io/gridplus-web-wallet/how-to-set-and-use-spending-limits',
    BTC_WALLET_STORAGE_KEY: 'btc_wallet',
}

const devConstants = {
    RATE_LIMIT: 2000, // 1s between requests
    BTC_DEV_DATA_API: 'https://blockstream.info/testnet/api',
    BASE_SIGNING_URL: 'https://signing.staging-gridpl.us',
    GRIDPLUS_CLOUD_API: 'https://pay.gridplus.io:3333',
    // Deprecating because using two different stores was very tricky and we don't
    // need the second one anyway
    // ROOT_STORE: 'gridplus-dev', 
    BTC_COIN: 0x80000000 + 1,
    BTC_DEFAULT_FEE_RATE: 10,
    BTC_TX_BASE_URL: 'https://www.blockchain.com/btc-testnet/tx',
    BTC_TESTNET: 'Testnet3',
    LATTICE_CERT_SIGNER: '045cfdf77a00b4b6b4a5b8bb26b5497dbc7a4d01cbefd7aaeaf5f6f8f8865976e7941ab0ec1651209c444009fd48d925a17de5040ba47eaf3f5b51720dd40b2f9d',
}

// By default we hide the BTC wallet, mapping to purpose = -1
constants.BTC_PURPOSE_NONE = -1;

// NEW: If you have checked the "Using Dev Lattice" box in settings, the constants
// are swapped out here
const localSettings = getLocalStorageSettings();
if (localSettings.devLattice) {
    Object.keys(devConstants).forEach((key) => {
        constants[key] = devConstants[key];
    })
}
exports.constants = constants;

//--------------------------------------------
// CHAIN DATA SYNCING HELPERS
//--------------------------------------------
function _fetchGET(url, cb) {
    fetch(url)
    .then((response) => response.json())
    .then((resp) => cb(null, resp))
    .catch((err) => cb(err))
}

//====== UTXOS ==================
// For mainnet (production env) we can bulk request data from the blockchain.com API
function _fetchBtcUtxos(addresses, cb) {

}

// For testnet we cannot use blockchain.com - we have to request stuff from each
// address individually.
function _fetchBtcUtxosTestnet(addresses, cb, utxos=[]) {
    const address = addresses.pop()
    const url = `${constants.BTC_DEV_DATA_API}/address/${address}/utxo`;
    _fetchGET(url, (err, data) => {
        if (err)
            return cb(err)
        data.forEach((u) => {
            // Add confirmed UTXOs
            if (u.status.confirmed) {
                utxos.push({
                    id: u.txid,
                    vout: u.vout,
                    value: u.value,
                })
            }
        })
        if (addresses.length === 0) {
            return cb(null, utxos);
        }
        setTimeout(() => {
            _fetchBtcUtxosTestnet(addresses, cb, utxos)
        }, constants.RATE_LIMIT)
    })
}

exports.fetchBtcUtxos = function(addresses, cb) {
    if (!addresses)
        return cb('Cannot fetch UTXOs - bad input');
    else if (addresses.length < 1)
        return cb(null, []);
    const addrsCopy = JSON.parse(JSON.stringify(addresses));
    const f = constants.BTC_DEV_DATA_API ? _fetchBtcUtxosTestnet : _fetchBtcUtxos;
    f(addrsCopy, cb);
}
//====== END UTXOS ==================

//====== TXS ==================
// For mainnet (production env) we can bulk request data from the blockchain.com API
function _fetchBtcTxs(addresses, cb) {

}

// For testnet we cannot use blockchain.com - we have to request stuff from each
// address individually.
function _fetchBtcTxsTestnet(addresses, cb, txs=[], lastSeenId=null) {
    const address = addresses.pop()
    let url = `${constants.BTC_DEV_DATA_API}/address/${address}/txs`;
    if (lastSeenId) {
        url = `${url}/chain/${lastSeenId}`
    }
    _fetchGET(url, (err, data) => {
        if (err)
            return cb(err)
        let formattedTxs = [];
        let confirmedCount = 0;
        data.forEach((t) => {
            const ftx = {
                timestamp: t.status.block_time * 1000,
                confirmed: t.status.confirmed,
                id: t.txid,
                fee: t.fee,
                inputs: [],
                outputs: [],                
            }
            t.vin.forEach((input) => {
                ftx.inputs.push({
                    addr: input.prevout.scriptpubkey_address,
                    value: input.prevout.value
                })
            })
            t.vout.forEach((output) => {
                ftx.outputs.push({
                    addr: output.scriptpubkey_address,
                    value: output.value
                })
            })
            formattedTxs.push(ftx)
            if (ftx.confirmed) {
                confirmedCount += 1;
            }
        })
        txs = txs.concat(formattedTxs)
        if (confirmedCount >= 25) {
            // Blockstream only returns up to 25 confirmed transactions per request
            // https://github.com/Blockstream/esplora/blob/master/API.md#get-addressaddresstxs
            // We need to re-request with the last tx
            addresses.push(address)
            return _fetchBtcTxsTestnet(addresses, cb, txs, txs[confirmedCount-1].id)
        }
        if (addresses.length === 0) {
            return cb(null, txs);
        }
        setTimeout(() => {
            _fetchBtcTxsTestnet(addresses, cb, txs)
        }, constants.RATE_LIMIT)
    })
}

exports.fetchBtcTxs = function(addresses, cb) {
    if (!addresses)
        return cb('Cannot fetch transactions - bad input');
    else if (addresses.length < 1)
        return cb(null, []);
    const addrsCopy = JSON.parse(JSON.stringify(addresses));
    const f = constants.BTC_DEV_DATA_API ? _fetchBtcTxsTestnet : _fetchBtcTxs;
    f(addrsCopy, cb);
}
//====== END TXS ==================

exports.fetchBtcPrice = function(cb) {
    const url = 'https://api.blockchain.com/v3/exchange/tickers/BTC-USD'
    _fetchGET(url, (err, data) => {
        if (err)
            return cb(err)
        else if (!data || !data.last_trade_price)
            return cb('Invalid price data returned');
        return cb(null, data.last_trade_price)
    })
}

//--------------------------------------------
// END CHAIN DATA SYNCING HELPERS
//--------------------------------------------

//--------------------------------------------
// LOCAL STORAGE HELPERS
//--------------------------------------------
function getLocalStorageSettings() {
    const storage = JSON.parse(window.localStorage.getItem(constants.ROOT_STORE) || '{}');
    const settings = storage.settings ? storage.settings : {};
    return settings;
}
exports.getLocalStorageSettings = getLocalStorageSettings;

//--------------------------------------------
// END LOCAL STORAGE HELPERS
//--------------------------------------------

//--------------------------------------------
// OTHER HELPERS
//--------------------------------------------
exports.harden = function(x) {
  return x + constants.HARDENED_OFFSET;
}

function getBtcPurpose() {
    const localSettings = getLocalStorageSettings();
    return  localSettings.btcPurpose ? 
            localSettings.btcPurpose : 
            constants.BTC_PURPOSE_NONE;
}
exports.getBtcPurpose = getBtcPurpose;

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
    // Sort utxos by value
    // First deduplicate utxos
    const hashes = [];
    const filteredUtxos = [];
    utxos.forEach((utxo) => {
      if (hashes.indexOf(utxo.txHash) === -1) {
        hashes.push(utxo.txHash);
        filteredUtxos.push(utxo);
      }
    })
    const sortedUtxos = filteredUtxos.sort((a, b) => { return a.value-b.value });
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
    const BASE_SIGNER_PATH = [getBtcPurpose(), constants.BTC_COIN, constants.HARDENED_OFFSET];
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
        // Send change to the latest change address
        changePath: BASE_SIGNER_PATH.concat([1, changeAddrs.length -1]),
    };
    return { currency: 'BTC', data: req }
}

exports.validateBtcAddr = function(addr) {
    if (addr === '') return null;
    try {
        bs58check.decode(addr);
        return true;
    } catch (e) {
        try {
            bech32.decode(addr);
            return true;
        } catch (e) {
            return false;
        }
    }
}

exports.toHexStr = function(bn) {
    const s = bn.toString(16);
    const base = s.length % 2 === 0 ? s : `0${s}`;
    return `0x${base}`; 
}

// Filter out any duplicate objects based on `keys`
function filterUniqueObjects(objs, keys) {
    const filtered = [];
    objs.forEach((obj) => {
        let isDup = false;
        filtered.forEach((fobj) => {
            let matchedKeys = 0
            keys.forEach((key) => {
                if (fobj[key] === obj[key]) {
                    matchedKeys += 1;
                }
            })
            if (matchedKeys >= keys.length) {
                isDup = true;
            }
        })
        if (!isDup) {
            filtered.push(obj);
        }
    })
    return filtered;
}
exports.filterUniqueObjects = filterUniqueObjects;
//--------------------------------------------
// END OTHER HELPERS
//--------------------------------------------