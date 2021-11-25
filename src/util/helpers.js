const bs58check = require('bs58check');
const bech32 = require('bech32').bech32;
const HARDENED_OFFSET = 0x80000000;
const constants = {
    DEFAULT_APP_NAME: 'Lattice Manager',
    ENV: process.env.REACT_APP_ENV || 'prod',
    BASE_SIGNING_URL: process.env.REACT_APP_BASE_SIGNING_URL || 'https://signing.gridpl.us',
    GRIDPLUS_CLOUD_API: process.env.REACT_APP_GRIDPLUS_CLOUD_API || 'https://pay.gridplus.io:3000',
    BTC_PROD_DATA_API: 'https://blockchain.info',
    ROOT_STORE: process.env.REACT_APP_ROOT_STORE || 'gridplus',
    HARDENED_OFFSET,
    ASYNC_SDK_TIMEOUT: 60000,
    SHORT_TIMEOUT: 30000,
    BTC_COIN: parseInt(process.env.REACT_APP_BTC_COIN) || HARDENED_OFFSET,
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
    BTC_PURPOSE_NONE: -1,
    BTC_PURPOSE_NONE_STR: 'Hide BTC Wallet',
    BTC_PURPOSE_LEGACY: HARDENED_OFFSET + 44,
    BTC_PURPOSE_LEGACY_STR: 'Legacy (1)',
    BTC_PURPOSE_WRAPPED_SEGWIT: HARDENED_OFFSET + 49,
    BTC_PURPOSE_WRAPPED_SEGWIT_STR: 'Wrapped Segwit (3)',
    BTC_PURPOSE_SEGWIT: HARDENED_OFFSET + 84,
    BTC_PURPOSE_SEGWIT_STR: 'Segwit (bc1)',
    BTC_SEGWIT_NATIVE_V0_PREFIX: 'bc',
    BTC_WRAPPED_SEGWIT_VERSION: 0x05,
}

const devConstants = {
    RATE_LIMIT: 1000, // 1s between requests
    BTC_DEV_DATA_API: 'https://blockstream.info/testnet/api',
    BASE_SIGNING_URL: 'https://signing.staging-gridpl.us',
    GRIDPLUS_CLOUD_API: 'https://pay.gridplus.io:3333',
    // Deprecating because using two different stores was very tricky and we don't
    // need the second one anyway
    // ROOT_STORE: 'gridplus-dev', 
    BTC_COIN: HARDENED_OFFSET + 1,
    BTC_DEFAULT_FEE_RATE: 10,
    BTC_TX_BASE_URL: 'https://www.blockchain.com/btc-testnet/tx',
    BTC_TESTNET: 'Testnet3',
    LATTICE_CERT_SIGNER: '045cfdf77a00b4b6b4a5b8bb26b5497dbc7a4d01cbefd7aaeaf5f6f8f8865976e7941ab0ec1651209c444009fd48d925a17de5040ba47eaf3f5b51720dd40b2f9d',
    BTC_SEGWIT_NATIVE_V0_PREFIX: 'tb',
    BTC_WRAPPED_SEGWIT_VERSION: 0xC4,

}

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
function _fetchBtcUtxos(addresses, cb, utxos=[], offset=0) {
    if (addresses.length === 0) {
        // No more addresses left to check. We are done.
        return cb(null, utxos);
    }
    const ADDRS_PER_CALL = 20;
    const MAX_UTOXS_RET = 50;
    const addrsToCheck = addresses.slice(0, ADDRS_PER_CALL);
    let url = `${constants.BTC_PROD_DATA_API}/unspent?active=`;
    for (let i = 0; i < addrsToCheck.length; i++) {
        if (i === 0) {
            url = `${url}${addrsToCheck[i]}`
        } else {
            url = `${url}|${addrsToCheck[i]}`
        }
    }
    url = `${url}&limit=${MAX_UTOXS_RET}&confirmations=1`;
    if (offset > 0) {
        // If this is a follow up, fetch txs after an offset
        url = `${url}&offset=${offset}`
    }
    _fetchGET(url, (err, data) => {
        if (err)
            return cb(err);
        // Add confirmed UTXOs
        data.unspent_outputs.forEach((u) => {
            if (u.confirmations > 0) {
                utxos.push({
                    id: u.tx_hash_big_endian,
                    vout: u.tx_output_n,
                    value: u.value,
                    address: _blockchainDotComScriptToAddr(u.script),
                })
            }
        })
        // Determine if we need to recurse on this set of addresses
        if (data.unspent_outputs.length >= MAX_UTOXS_RET) {
            return setTimeout(() => {
                _fetchBtcUtxos(addresses, cb, utxos, offset+MAX_UTOXS_RET);
            }, constants.RATE_LIMIT);
        }
        // Otherwise we are done with these addresses. Clip them and recurse.
        addresses = addresses.slice(ADDRS_PER_CALL);
        setTimeout(() => {
            _fetchBtcUtxos(addresses, cb, utxos, 0);
        }, constants.RATE_LIMIT);
    })
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
                    address,
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
    setTimeout(() => {
        f(addrsCopy, cb);
    }, constants.RATE_LIMIT)
}
//====== END UTXOS ==================

//====== TXS ==================
// For mainnet (production env) we can bulk request data from the blockchain.com API
function _fetchBtcTxs(addresses, cb, txs=[], offset=0) {
    if (addresses.length === 0) {
        // No more addresses left to check. We are done.
        return cb(null, txs);
    }
    const ADDRS_PER_CALL = 20;
    const MAX_TXS_RET = 50;
    const addrsToCheck = addresses.slice(0, ADDRS_PER_CALL);
    let url = `${constants.BTC_PROD_DATA_API}/multiaddr?active=`;
    for (let i = 0; i < addrsToCheck.length; i++) {
        if (i === 0) {
            url = `${url}${addrsToCheck[i]}`
        } else {
            url = `${url}|${addrsToCheck[i]}`
        }
    }
    url = `${url}&n=${MAX_TXS_RET}`;
    if (offset > 0) {
        // If this is a follow up, fetch txs after an offset
        url = `${url}&offset=${offset}`
    }
    _fetchGET(url, (err, data) => {
        if (err)
            return cb(err);
        // Add the new txs
        const formattedTxs = [];
        data.txs.forEach((t) => {
            const ftx = {
                timestamp: t.time * 1000,
                confirmed: !!t.block_index,
                id: t.hash,
                fee: t.fee,
                inputs: [],
                outputs: [],
            };
            t.inputs.forEach((input) => {
                ftx.inputs.push({
                    addr: input.prev_out.addr,
                    value: input.prev_out.value,
                })
            })
            t.out.forEach((output) => {
                ftx.outputs.push({
                    addr: output.addr,
                    value: output.value,
                })
            })
            formattedTxs.push(ftx);
        })
        txs = txs.concat(formattedTxs)
        // Determine if we need to recurse on this set of addresses
        if (formattedTxs.length >= MAX_TXS_RET) {
            return setTimeout(() => {
                _fetchBtcTxs(addresses, cb, txs, offset+MAX_TXS_RET);
            }, constants.RATE_LIMIT);
        }
        // Otherwise we are done with these addresses. Clip them and recurse.
        addresses = addresses.slice(ADDRS_PER_CALL);
        setTimeout(() => {
            _fetchBtcTxs(addresses, cb, txs, 0);
        }, constants.RATE_LIMIT);
    })
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
        const formattedTxs = [];
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
    setTimeout(() => {
        f(addrsCopy, cb);
    }, constants.RATE_LIMIT)
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
  return x + HARDENED_OFFSET;
}

// Convert a script from blockchain.com's API into an address
// For some reason, they only return the script in the UTXO object.
// We need to convert the script to a an address.
// Since we know the purpose, we know the format of the address,
// so we can slice out the pubkeyhash from the script and convert.
function _blockchainDotComScriptToAddr(_scriptStr) {
    const purpose = getBtcPurpose();
    if (purpose === constants.BTC_PURPOSE_SEGWIT) {
        const bech32Prefix = constants.BTC_SEGWIT_NATIVE_V0_PREFIX;
        const bech32Version = 0; // Only v0 currently supported
        // Script: |OP_0|0x20|pubkeyhash|
        const pubkeyhash = Buffer.from(_scriptStr, 'hex').slice(-20)
        const words = bech32.toWords(pubkeyhash);
        words.unshift(bech32Version);
        return bech32.encode(bech32Prefix, words);
    } else if (purpose === constants.BTC_PURPOSE_WRAPPED_SEGWIT) {
        const version = constants.BTC_WRAPPED_SEGWIT_VERSION;
        // Script: |OP_HASH160|0x20|pubkeyhash|OP_EQUAL|
        const pubkeyhash = Buffer.from(_scriptStr, 'hex').slice(2, 22);
        return bs58check.encode(Buffer.concat([Buffer.from([version]), pubkeyhash]));
    } else if (purpose === constants.BTC_PURPOSE_LEGACY) {
        // Script: |OP_DUP|OP_HASH160|0x20|pubkeyhash|OP_EQUALVERIFY|OP_CHECKSIG|
        const version = constants.BTC_WRAPPED_SEGWIT_VERSION;
        const pubkeyhash = Buffer.from(_scriptStr, 'hex').slice(3, 23);
        return bs58check.encode(Buffer.concat([Buffer.from([version]), pubkeyhash]));
    }
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
      if (hashes.indexOf(utxo.id) === -1) {
        hashes.push(utxo.id);
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
                txHash: utxo.id,
                value: utxo.value,
                index: utxo.vout,
                signerPath: BASE_SIGNER_PATH.concat([0, addrs.indexOf(utxo.address)]),
            })
        } else if (changeAddrs.indexOf(utxo.address) > -1) {
            const prevOut = {
                txHash: utxo.id,
                value: utxo.value,
                index: utxo.vout,
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