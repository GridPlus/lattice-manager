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
}
if (process.env.REACT_APP_ENV === 'dev') {
    constants.GRIDPLUS_CLOUD_API = 'https://pay.gridplus.io:3333';
    constants.ROOT_STORE = 'gridplus-dev';
    constants.BTC_COIN = 0x80000000 + 1; // Use testnet
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
    if (!addresses[currency] || addresses[currency].length === 0) return cb(null);

    const data = {
        method: 'POST',
        body: JSON.stringify([{
        currency,
        addresses: addresses[currency],
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


