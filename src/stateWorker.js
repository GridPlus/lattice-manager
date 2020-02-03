
export default () => {
    let addresses = {};
    let interval = null;
    let BASE_URL = 'localhost:3000'; // Should never use the default
    const LOOKUP_DELAY = 120000; // Lookup every 2 minutes
    self.addEventListener('message', e => { // eslint-disable-line no-restricted-globals
        if (!e) return;
        switch (e.data.type) {
            case 'setup':
                BASE_URL = e.data.data;
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
                    fetchStateDataCopyPasta(baseCurrency, addresses, (err, data) => {
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

    // We also have to copypasta this helper grrrr
    function fetchStateDataCopyPasta(currency, addresses, cb) {
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
        const url = `${BASE_URL}/v2/accounts/get-data`
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

}