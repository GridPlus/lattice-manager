
export default () => {
    let addresses = {};
    let interval = null;
    let BASE_URL = 'localhost:3000'; // Should never use the default
    const LOOKUP_DELAY = 120000; // Lookup every 2 minutes
    let currentPage = 1; // Page of transactions to look for. Only applicable for ETH
    self.addEventListener('message', e => { // eslint-disable-line no-restricted-globals
        if (!e) return;
        switch (e.data.type) {
            case 'setup':
                BASE_URL = e.data.data;
                break;
            case 'setPage':
                currentPage = e.data.data;
                break;
            case 'setAddresses':
                // This will get called either when the wallet boots up or when we get
                // a refreshed wallet state.
                // NOTE: If there is no active wallet (and no addresses), we will still
                // tick, but no http requests will be made in the iteration
                const addrs = e.data.data;
                const currencies = Object.keys(addrs) || [];
                if (currencies.length === 0) {
                    // If we didn't get any data from `addrs`, it means we got an empty
                    // active wallet and had to clear out the addresses in the SDK session.
                    // We should do the same here.
                    addresses = {};
                } else {
                    // Otherwise, update addresses for the currencies provided.
                    // NOTE: We leave the other currencies alone.
                    Object.keys(addrs).forEach((k) => { addresses[k] = addrs[k]; });
                }
                tick();
                break;
            case 'stop':
                clearInterval(interval);
                break;
            default:
                break;
        }
    })

    // Process tick -- periodically lookup blockchain state data for the addresses we have
    // on this secondary thread. This should get reset and re-called whenever we get new addresses.
    // NOTE: The interval won't actually start until the delay has passed.
    function tick() {
        // Clear the interval
        clearInterval(interval);
        // Replace that cleared interval
        interval = setInterval(() => {
            function lookupData(currencies=Object.keys(addresses)) {
                if (currencies.length > 0) {
                    const currency = currencies.pop();
                    // Account for change addresses
                    let baseCurrency = currency;
                    if (currency.indexOf('_CHANGE') > -1) {
                        baseCurrency = currency.slice(0, currency.indexOf('_CHANGE'));
                    }
                    // Fetch the state data with our set of addresses for this currency
                    fetchStateData(baseCurrency, addresses, currentPage, (err, data) => {
                        if (err) {
                            // Log the error if it arises
                            postMessage({ type: "error", currency, data: err });
                        } else {
                            // If we got a non-error response, post the data back to the
                            // main thread.
                            postMessage({ type: "dataResp", currency, data })
                        }
                        lookupData(currencies);
                    })
                } else {
                    // We are done looping through currencies
                    postMessage({ type: "iterationDone" })
                }
            }
        
            lookupData();
        }, LOOKUP_DELAY)
    }


    //---------------------//
    // WEBWORKER COPYPASTA //
    //---------------------//

    //-------- GET DATA HELPER
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };

    function fetchETHNonce(currency, addresses) {
        return new Promise((resolve, reject) => {
            if (currency !== 'ETH' || addresses.length < 1)
                return resolve(null);
            const url = `${BASE_URL}/v2/accounts/get-transaction-count`
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
                return reject(err);
            });
        })
    }

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
    // @param page      {number}   -- page of transactions to request (ignored if currency!=ETH)
    // @param cb        {function} -- callback function of form cb(err, data)
    function fetchStateData(currency, addresses, page, cb) {
        const reqAddresses = addresses[currency];

        // Exit if we don't have addresses to use in the request
        if (!reqAddresses || reqAddresses.length === 0) 
            return cb(null);

        // Slice out the 'change' portion of the currency name for the request itself
        if (currency.indexOf('_CHANGE') > -1)
            currency = currency.slice(0, currency.indexOf('_CHANGE'));

        let stateData = {
            currency,
            transactions: [], // ETH + ERC20 transactions
            balance: {}, // ETH balance
            erc20Balances: [], // ERC20 balances
            ethNonce: null,
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
    //-------- END GET DATA

}