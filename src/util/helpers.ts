import localStorage from "./localStorage";
import { bech32 } from "bech32";
import bs58check from "bs58check";
import { Buffer } from "buffer";

const HARDENED_OFFSET = 0x80000000;
export const constants = {
  DEFAULT_APP_NAME: "Lattice Manager",
  BASE_SIGNING_URL: "https://signing.gridpl.us",
  BTC_PROD_DATA_API: "https://blockchain.info",
  BTC_BROADCAST_ENDPOINT: "https://blockstream.info/api/tx",
  HARDENED_OFFSET,
  ASYNC_SDK_TIMEOUT: 60000,
  ADDRESSES_PER_PAGE: 10,
  ADDRESS_RECORD_TYPE: 0,
  CONTRACTS_PER_PAGE: 10,
  SHORT_TIMEOUT: 30000,
  BTC_COIN: HARDENED_OFFSET,
  SATS_TO_BTC: Math.pow(10, 8),
  BTC_MAIN_GAP_LIMIT: 20,
  BTC_CHANGE_GAP_LIMIT: 1,
  BTC_ADDR_BLOCK_LEN: 10,
  BTC_CHANGE_ADDR_BLOCK_LEN: 1,
  BTC_DEFAULT_FEE_RATE: 10, // 10 sat/byte
  BTC_TX_BASE_URL: "https://www.blockchain.com/btc/tx",
  PAGE_SIZE: 20, // 20 transactions per requested page, per `gridplus-cloud-services`
  CONTRACT_PAGE_SIZE: 6,
  LOST_PAIRING_ERR: "NOT_PAIRED",
  LOST_PAIRING_MSG: "Cannot find Lattice connection. Please re-connect.",
  BTC_TESTNET: null,
  KEYRING_LOGOUT_MS: 2592000000, // default 30 days
  KEYRING_DATA_PATH: "gridplus_web_wallet_keyring_logins", // item in localStorage
  ABI_PACK_URL: "https://gridplus.github.io/abi-pack-framework",
  LATTICE_CERT_SIGNER:
    "0477816e8e83bb17c4309cc2e5aa134c573a5943154940095a423149f7cc0384ad52d33f1b4cd89c967bf211c039202df3a7899cb7543de4738c96a81cfde4b117",
  CONTRACTS_HELP_LINK:
    "https://docs.gridplus.io/gridplus-web-wallet/use-ethereum-smart-contract-abi-function-definitions",
  TAGS_HELP_LINK: "https://docs.gridplus.io/gridplus-web-wallet/address-tags",
  PERMISSIONS_HELP_LINK:
    "https://docs.gridplus.io/gridplus-web-wallet/how-to-set-and-use-spending-limits",
  POAP_CLAIM_REMOTE_URL:
    "https://us-central1-lattice-poap.cloudfunctions.net/validate",
  BTC_WALLET_STORAGE_KEY: "btc_wallet",
  BTC_PURPOSE_NONE: -1,
  BTC_PURPOSE_NONE_STR: "Hide BTC Wallet",
  BTC_PURPOSE_LEGACY: HARDENED_OFFSET + 44,
  BTC_PURPOSE_LEGACY_STR: "Legacy (1)",
  BTC_PURPOSE_WRAPPED_SEGWIT: HARDENED_OFFSET + 49,
  BTC_PURPOSE_WRAPPED_SEGWIT_STR: "Wrapped Segwit (3)",
  BTC_PURPOSE_SEGWIT: HARDENED_OFFSET + 84,
  BTC_PURPOSE_SEGWIT_STR: "Segwit (bc1)",
  BTC_SEGWIT_NATIVE_V0_PREFIX: "bc",
  BTC_LEGACY_VERSION: 0x00,
  BTC_WRAPPED_SEGWIT_VERSION: 0x05,
  RATE_LIMIT: 2000, // 2s between requests
  THROTTLE_RATE_LIMIT: 5000, // 5s between requests
  GET_ABI_URL:
    "https://api.etherscan.io/api?module=contract&action=getabi&address=",
  DEFAULT_CONTRACT_NETWORK: "ethereum",
  CONTRACT_NETWORKS: {
    ethereum: {
      label: "Ethereum",
      url: "https://etherscan.io",
      baseUrl: "https://api.etherscan.io",
      apiRoute: "api?module=contract&action=getabi&address=",
    },
    arbitrum: {
      label: "Arbitrum",
      url: "https://arbiscan.io",
      baseUrl: "https://api.arbiscan.io",
      apiRoute: "api?module=contract&action=getabi&address=",
    },
    polygon: {
      label: "Polygon",
      url: "https://polygonscan.com",
      baseUrl: "https://api.polygonscan.com",
      apiRoute: "api?module=contract&action=getabi&address=",
    },
    optimism: {
      label: "Optimism",
      url: "https://optimistic.etherscan.io",
      baseUrl: "https://api-optimistic.etherscan.io",
      apiRoute: "api?module=contract&action=getabi&address=",
    },
    binance: {
      label: "Binance",
      url: "https://bscscan.com/",
      baseUrl: "https://api.bscscan.com",
      apiRoute: "api?module=contract&action=getabi&address=",
    },
    avalanche: {
      label: "Avalanche",
      url: "https://snowtrace.io",
      baseUrl: "https://api.snowtrace.io",
      apiRoute: "api?module=contract&action=getabi&address=",
    },
  },
  PAGE_KEYS: {
    LANDING: "LANDING",
    ADDRESS_TAGS: "ADDRESS_TAGS",
    EXPLORER: "EXPLORER",
    SETTINGS: "SETTINGS",
    WALLET: "WALLET",
    SEND: "SEND",
    RECEIVE: "RECEIVE",
    XPUB: "XPUB",
  },
};

//--------------------------------------------
// CHAIN DATA SYNCING HELPERS
//--------------------------------------------
function fetchJSON(url, opts, cb) {
  fetch(url, opts)
    .then((response) => response.json())
    .then((resp) => cb(null, resp))
    .catch((err) => cb(err));
}

const resolveAfter = (delay) => new Promise((ok) => setTimeout(ok, delay));

function throttle(fn, delay) {
  let wait: any = Promise.resolve();
  return (...args) => {
    const res = wait.then(() => fn(...args));
    wait = wait.then(() => resolveAfter(delay));
    return res;
  };
}

const throttledFetchJSON = throttle(fetchJSON, constants.THROTTLE_RATE_LIMIT);

//====== UTXOS ==================
// For mainnet (production env) we can bulk request data from the blockchain.com API
function _fetchBtcUtxos(addresses, cb, utxos = [], offset = 0) {
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
      url = `${url}${addrsToCheck[i]}`;
    } else {
      url = `${url}|${addrsToCheck[i]}`;
    }
  }
  url = `${url}&limit=${MAX_UTOXS_RET}&confirmations=1`;
  if (offset > 0) {
    // If this is a follow up, fetch txs after an offset
    url = `${url}&offset=${offset}`;
  }
  fetchJSON(url, null, (err, data) => {
    if (err) return cb(err);
    // Add confirmed UTXOs
    data.unspent_outputs.forEach((u) => {
      if (u.confirmations > 0) {
        utxos.push({
          id: u.tx_hash_big_endian,
          vout: u.tx_output_n,
          value: u.value,
          address: _blockchainDotComScriptToAddr(u.script),
        });
      }
    });
    // Determine if we need to recurse on this set of addresses
    if (data.unspent_outputs.length >= MAX_UTOXS_RET) {
      return setTimeout(() => {
        _fetchBtcUtxos(addresses, cb, utxos, offset + MAX_UTOXS_RET);
      }, constants.RATE_LIMIT);
    }
    // Otherwise we are done with these addresses. Clip them and recurse.
    addresses = addresses.slice(ADDRS_PER_CALL);
    setTimeout(() => {
      _fetchBtcUtxos(addresses, cb, utxos, 0);
    }, constants.RATE_LIMIT);
  });
}

// For testnet we cannot use blockchain.com - we have to request stuff from each
// address individually.
function _fetchBtcUtxosTestnet(addresses, cb, utxos = []) {
  const address = addresses.pop();
  //@ts-expect-error
  const url = `${constants.BTC_DEV_DATA_API}/address/${address}/utxo`;
  fetchJSON(url, null, (err, data) => {
    if (err) return cb(err);
    data.forEach((u) => {
      // Add confirmed UTXOs
      if (u.status.confirmed) {
        utxos.push({
          id: u.txid,
          vout: u.vout,
          value: u.value,
          address,
        });
      }
    });
    if (addresses.length === 0) {
      return cb(null, utxos);
    }
    setTimeout(() => {
      _fetchBtcUtxosTestnet(addresses, cb, utxos);
    }, constants.RATE_LIMIT);
  });
}

export function fetchBtcUtxos(addresses, cb) {
  if (!addresses) return cb("Cannot fetch UTXOs - bad input");
  else if (addresses.length < 1) return cb(null, []);
  const addrsCopy = JSON.parse(JSON.stringify(addresses));
  //@ts-expect-error
  const f = constants.BTC_DEV_DATA_API ? _fetchBtcUtxosTestnet : _fetchBtcUtxos;
  f(addrsCopy, cb);
}
//====== END UTXOS ==================

//====== TXS ==================
// For mainnet (production env) we can bulk request data from the blockchain.com API
function _fetchBtcTxs(addresses, txs, cb, offset = 0, isFirstCall = true) {
  if (addresses.length === 0) {
    // No more addresses left to check. We are done.
    return cb(null, txs);
  }

  let url = `${constants.BTC_PROD_DATA_API}/multiaddr?active=`;
  let fetchFn = fetchJSON;
  const isSingleAddr = isFirstCall && addresses.length === 1;
  if (isSingleAddr) {
    // Edge case when getting transactions from the blockchain.com API with
    // only one address -- it appears when you call multiaddr with only one
    // address you get only the output(s) associated with that one address,
    // but if you call with multiple addresses that is no longer a problem.
    // See: https://www.blockchain.com/btc/tx/ffc83686c911bcf7aa31a3d3ca014bae3b1044b2ec280c877758aa6b384cde0b
    // 1. https://blockchain.info/rawaddr/3BrvBeRy8qMijfZHzo8VJ77gdL1W9EvgHj
    // 2. https://blockchain.info/multiaddr?active=3C8BhX4CGeyH3nXrYqRL89jvpakTPW1z8k|3BrvBeRy8qMijfZHzo8VJ77gdL1W9EvgHj
    url = `${constants.BTC_PROD_DATA_API}/rawaddr/`;
  }
  const ADDRS_PER_CALL = 20;
  const MAX_TXS_RET = 50;
  const addrsToCheck = addresses.slice(0, ADDRS_PER_CALL);
  for (let i = 0; i < addrsToCheck.length; i++) {
    if (i === 0) {
      url = `${url}${addrsToCheck[i]}`;
    } else {
      url = `${url}|${addrsToCheck[i]}`;
    }
  }
  if (isSingleAddr) {
    url = `${url}?limit=${MAX_TXS_RET}`;
    fetchFn = throttledFetchJSON;
  } else {
    url = `${url}&n=${MAX_TXS_RET}`;
  }
  if (offset > 0) {
    // If this is a follow up, fetch txs after an offset
    url = `${url}&offset=${offset}`;
  }
  fetchFn(url, null, (err, data) => {
    if (err) return cb(err);
    // Add the new txs
    let txsAdded = 0;
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
        });
      });
      t.out.forEach((output) => {
        ftx.outputs.push({
          addr: output.addr,
          value: output.value,
        });
      });
      if (!ftx.confirmed) {
        ftx.timestamp = -1;
      }

      // Only add the transaction if its hash is not already in the array.
      // NOTE: There may be an edge case. I noticed in one case we got
      // a result saying `vout_sz=2` but which only had one output in its array...
      let shouldInclude = txs.every((_tx) => _tx.id !== ftx.id);
      if (shouldInclude) {
        txs.push(ftx);
        txsAdded += 1;
      }
    });
    // Determine if we need to recurse on this set of addresses
    if (txsAdded >= MAX_TXS_RET) {
      return setTimeout(() => {
        _fetchBtcTxs(addresses, txs, cb, offset + MAX_TXS_RET, false);
      }, constants.RATE_LIMIT);
    }
    // Otherwise we are done with these addresses. Clip them and recurse.
    addresses = addresses.slice(ADDRS_PER_CALL);
    setTimeout(() => {
      _fetchBtcTxs(addresses, txs, cb, 0, false);
    }, constants.RATE_LIMIT);
  });
}

// For testnet we cannot use blockchain.com - we have to request stuff from each
// address individually.
function _fetchBtcTxsTestnet(addresses, txs, cb, lastSeenId = null) {
  const address = addresses.pop();
  //@ts-expect-error
  let url = `${constants.BTC_DEV_DATA_API}/address/${address}/txs`;
  if (lastSeenId) {
    url = `${url}/chain/${lastSeenId}`;
  }
  fetchJSON(url, null, (err, data) => {
    if (err) return cb(err);
    const formattedTxs: any[] = [];
    let confirmedCount = 0;
    data.forEach((t) => {
      const ftx = {
        timestamp: t.status.block_time * 1000,
        confirmed: t.status.confirmed,
        id: t.txid,
        fee: t.fee,
        inputs: [],
        outputs: [],
      };
      t.vin.forEach((input) => {
        ftx.inputs.push({
          addr: input.prevout.scriptpubkey_address,
          value: input.prevout.value,
        });
      });
      t.vout.forEach((output) => {
        ftx.outputs.push({
          addr: output.scriptpubkey_address,
          value: output.value,
        });
      });
      if (!ftx.confirmed) {
        ftx.timestamp = -1;
      }
      formattedTxs.push(ftx);
      if (ftx.confirmed) {
        confirmedCount += 1;
      }
    });
    txs = txs.concat(formattedTxs);
    if (confirmedCount >= 25) {
      // Blockstream only returns up to 25 confirmed transactions per request
      // https://github.com/Blockstream/esplora/blob/master/API.md#get-addressaddresstxs
      // We need to re-request with the last tx
      addresses.push(address);
      return _fetchBtcTxsTestnet(
        addresses,
        txs,
        cb,
        txs[confirmedCount - 1].id
      );
    }
    if (addresses.length === 0) {
      return cb(null, txs);
    }
    setTimeout(() => {
      _fetchBtcTxsTestnet(addresses, txs, cb);
    }, constants.RATE_LIMIT);
  });
}

export function fetchBtcTxs(addresses, txs, cb) {
  if (!addresses) return cb("Cannot fetch transactions - bad input");
  else if (addresses.length < 1) return cb(null, []);
  const addrsCopy = JSON.parse(JSON.stringify(addresses));
  //@ts-expect-error
  const f = constants.BTC_DEV_DATA_API ? _fetchBtcTxsTestnet : _fetchBtcTxs;
  f(addrsCopy, txs, cb);
}
//====== END TXS ==================

export function fetchBtcPrice(cb) {
  const url = "https://api.blockchain.com/v3/exchange/tickers/BTC-USD";
  fetchJSON(url, null, (err, data) => {
    if (err) return cb(err);
    else if (!data || !data.last_trade_price)
      return cb("Invalid price data returned");
    return cb(null, data.last_trade_price);
  });
}

export function broadcastBtcTx(rawTx, cb) {
  const opts = {
    method: "POST",
    body: rawTx,
  };
  fetch(constants.BTC_BROADCAST_ENDPOINT, opts)
    .then((response) => response.text())
    .then((resp) => cb(null, resp))
    .catch((err) => cb(err));
}
//--------------------------------------------
// END CHAIN DATA SYNCING HELPERS
//--------------------------------------------

//--------------------------------------------
// OTHER HELPERS
//--------------------------------------------
export function harden(x) {
  return x + HARDENED_OFFSET;
}

// Determine how many inputs (utxos) need to be included in a transaction
// given the desired value and fee rate
// Returns the number of inputs to include or -1 if there isn't enough
// value in the inputs provided to cover value + fee
function _calcBtcTxNumInputs(
  utxos,
  value,
  feeRate,
  inputIdx = 0,
  currentValue = 0
) {
  if (inputIdx >= utxos.length) {
    return -1; // indicates error
  }
  currentValue += utxos[inputIdx].value;
  const numInputs = inputIdx + 1;
  const numBytes = getBtcNumTxBytes(numInputs);
  const fee = Math.floor(feeRate * numBytes);
  if (currentValue >= value + fee) {
    return numInputs;
  }
  inputIdx = numInputs;
  return _calcBtcTxNumInputs(utxos, value, feeRate, inputIdx, currentValue);
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
    const pubkeyhash = Buffer.from(_scriptStr, "hex").slice(-20);
    const words = bech32.toWords(pubkeyhash);
    words.unshift(bech32Version);
    return bech32.encode(bech32Prefix, words);
  } else if (purpose === constants.BTC_PURPOSE_WRAPPED_SEGWIT) {
    const version = constants.BTC_WRAPPED_SEGWIT_VERSION;
    // Script: |OP_HASH160|0x20|pubkeyhash|OP_EQUAL|
    const pubkeyhash = Buffer.from(_scriptStr, "hex").slice(2, 22);
    return bs58check.encode(
      Buffer.concat([Buffer.from([version]), pubkeyhash])
    );
  } else if (purpose === constants.BTC_PURPOSE_LEGACY) {
    // Script: |OP_DUP|OP_HASH160|0x20|pubkeyhash|OP_EQUALVERIFY|OP_CHECKSIG|
    const version = constants.BTC_LEGACY_VERSION;
    const pubkeyhash = Buffer.from(_scriptStr, "hex").slice(3, 23);
    return bs58check.encode(
      Buffer.concat([Buffer.from([version]), pubkeyhash])
    );
  }
}

export function getBtcPurpose() {
  const localSettings = localStorage.getSettings();
  return localSettings.btcPurpose
    ? localSettings.btcPurpose
    : constants.BTC_PURPOSE_NONE;
}

// Calculate how many bytes will be in a transaction given purpose and input count
// Calculations come from: https://github.com/jlopp/bitcoin-transaction-size-calculator/blob/master/index.html
// Not a perfect calculation but pretty close
export function getBtcNumTxBytes(numInputs) {
  let inputSize, outputSize, inputWitnessSize;
  const purpose = getBtcPurpose();
  if (purpose === constants.BTC_PURPOSE_LEGACY) {
    inputSize = 148;
    outputSize = 32;
    inputWitnessSize = 0;
  } else if (purpose === constants.BTC_PURPOSE_SEGWIT) {
    inputSize = 91;
    outputSize = 32;
    inputWitnessSize = 107; // size(signature) + signature + size(pubkey) + pubkey
  } else {
    inputSize = 67.75;
    outputSize = 31;
    inputWitnessSize = 107; // size(signature) + signature + size(pubkey) + pubkey
  }
  const vFactor = purpose === constants.BTC_PURPOSE_LEGACY ? 0 : 0.75;
  // Hardcode 2 outputs to avoid complexity in app state
  const txVBytes = 10 + vFactor + inputSize * numInputs + outputSize * 2;
  return 3 * vFactor + txVBytes + inputWitnessSize * numInputs;
}

export function buildBtcTxReq(
  recipient,
  btcValue,
  utxos,
  addrs,
  changeAddrs,
  feeRate = constants.BTC_DEFAULT_FEE_RATE,
  isFullSpend = false
) {
  if (!addrs || !changeAddrs || addrs.length < 1 || changeAddrs.length < 1) {
    return {
      error: "No addresses (or change addresses). Please wait to sync.",
    };
  }
  // Convert value to satoshis
  const satValue = Math.round(Number(btcValue) * constants.SATS_TO_BTC);
  const numInputs = isFullSpend
    ? utxos.length
    : _calcBtcTxNumInputs(utxos, satValue, feeRate);
  if (numInputs < 0) {
    return { error: "Balance too low." };
  } else if (numInputs > utxos.length) {
    return { error: "Failed to build transaction." };
  }
  const bytesUsed = getBtcNumTxBytes(numInputs);
  const fee = Math.floor(bytesUsed * feeRate);
  // Build the request inputs
  const BASE_SIGNER_PATH = [
    getBtcPurpose(),
    constants.BTC_COIN,
    constants.HARDENED_OFFSET,
  ];
  const prevOuts: any[] = [];
  for (let i = 0; i < numInputs; i++) {
    const utxo = utxos[i];
    let signerPath = null;
    if (addrs.indexOf(utxo.address) > -1) {
      signerPath = BASE_SIGNER_PATH.concat([0, addrs.indexOf(utxo.address)]);
    } else if (changeAddrs.indexOf(utxo.address) > -1) {
      signerPath = BASE_SIGNER_PATH.concat([
        1,
        changeAddrs.indexOf(utxo.address),
      ]);
    } else {
      return { error: "Failed to find holder of UTXO. Syncing issue likely." };
    }
    const prevOut = {
      txHash: utxo.id,
      value: utxo.value,
      index: utxo.vout,
      signerPath,
    };
    prevOuts.push(prevOut);
  }
  // Return the request (i.e. the whole object)
  const req = {
    prevOuts,
    recipient,
    value: satValue,
    fee,
    // Send change to the latest change address
    changePath: BASE_SIGNER_PATH.concat([1, changeAddrs.length - 1]),
  };
  return { currency: "BTC", data: req };
}

export function validateBtcAddr(addr) {
  if (addr === "") return null;
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

export function toHexStr(bn) {
  const s = bn.toString(16);
  const base = s.length % 2 === 0 ? s : `0${s}`;
  return `0x${base}`;
}

// Filter out any duplicate objects based on `keys`
export function filterUniqueObjects(objs, keys) {
  const filtered: any[] = [];
  // Copy the objects in reversed order so that newer instances
  // are applied first
  const objsCopy = JSON.parse(JSON.stringify(objs)).reverse();
  objsCopy.forEach((obj) => {
    let isDup = false;
    filtered.forEach((fobj) => {
      let matchedKeys = 0;
      keys.forEach((key) => {
        if (fobj[key] === obj[key]) {
          matchedKeys += 1;
        }
      });
      if (matchedKeys >= keys.length) {
        isDup = true;
      }
    });
    if (!isDup) {
      filtered.push(obj);
    }
  });
  // Return in the original order
  return filtered.reverse();
}
//--------------------------------------------
// END OTHER HELPERS
//--------------------------------------------
