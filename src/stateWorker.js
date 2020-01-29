
export default () => {
    let addresses = {};
    let interval = null;
    const LOOKUP_DELAY = 10000 //180000; // Lookup every 3 minutes

    self.addEventListener('message', e => { // eslint-disable-line no-restricted-globals
        if (!e) return;
        switch (e.data.type) {
            case 'newAddresses':
                const addrs = e.data.data;
                Object.keys(addrs).forEach((k) => {
                    addresses[k] = addrs[k];
                })
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
                    fetchStateDataCopyPasta(currency, addresses, (err, data) => {
                        if (err) {
                            // Log the error if it arises
                            // TODO: Handle errors
                            console.error('Error fetching state data for', currency, err);
                            postMessage({ type: "error", currency, data: err });
                        } else {
                            // If we got a non-error response, post the data back to the
                            // main thread.
                            postMessage({ type: "dataResp", currency, data })
                        }
                        lookupData(currencies);
                    })
                }
            }
        
            lookupData();
        }, LOOKUP_DELAY)
    }


    //---------------------//
    // WEBWORKER COPYPASTA //
    //---------------------//

    // Can't import constants, so we copypasta the relevant one
    const GRIDPLUS_CLOUD_API_COPYPASTA = 'https://pay.gridplus.io:3000';

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
        const url = `${GRIDPLUS_CLOUD_API_COPYPASTA}/v2/accounts/get-data`
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