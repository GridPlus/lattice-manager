import { Client } from "gridplus-sdk";
import {
  broadcastBtcTx,
  constants,
  fetchBtcPrice,
  fetchBtcTxs,
  fetchBtcUtxos,
  filterUniqueObjects,
  getBtcPurpose,
  harden
} from "../util/helpers";
import { default as StorageSession } from "../util/storageSession";

class BitcoinSession {
  client: Client;
  crypto: any;
  name: any;
  storageSession: any;
  deviceId: any;
  page: number;
  baseUrl: any;
  addresses: BtcAddresses;
  btcTxs: any[];
  btcUtxos: any[];
  lastFetchedBtcData: number;
  btcPrice: number;

  constructor(client, deviceId, name = null, opts: any = {}) {
    this.client = client;
    this.crypto = null;
    this.name = name || constants.DEFAULT_APP_NAME; // app name
    // Make use of localstorage to persist wallet data
    this.storageSession = null;
    // Save the device ID for the session
    this.deviceId = deviceId;

    // Current page of results (transactions) for the wallet
    this.page = 1; // (1-indexed)

    // Configurable settings
    this.baseUrl = opts.customEndpoint
      ? opts.customEndpoint
      : constants.BASE_SIGNING_URL;

    // BTC wallet data
    this.addresses = {} as any; // Contains BTC and BTC_CHANGE addresses
    this.btcTxs = []; // Contains all txs for all addresses
    this.btcUtxos = []; // Contains all utxos for all addresses
    this.lastFetchedBtcData = 0; // Timestamp containing the last time we updated data
    this.btcPrice = 0; // Price in dollars of full unit BTC

    // Go time

    if (client && client.isPaired) {
      this.getBtcWalletData();
    }
  }

  disconnect () {
    this.saveBtcWalletData();
    this.storageSession = null;
    this.deviceId = null;
  }

  isConnected () {
    return this.client !== null;
  }

  isPaired () {
    return this.client?.isPaired || false;
  }

  resetStateData () {
    this.addresses = {} as any;
    this.btcTxs = [];
    this.btcUtxos = [];
  }

  getBtcDisplayAddress () {
    // If we have set the next address to use, display that.
    // Otherwise, fallback on the first address.
    const lastUsed = this._getLastUsedBtcAddrIdx();
    if (lastUsed > -1 && this.addresses.BTC[lastUsed + 1])
      return this.addresses.BTC[lastUsed + 1];
    else if (this.addresses.BTC && this.addresses.BTC.length > 0)
      return this.addresses.BTC[0];
    else return null;
  }

  getActiveWallet () {
    if (!this.client) return null;
    return this.client.getActiveWallet();
  }

  setPage (newPage = 1) {
    this.page = newPage;
  }

  getPage () {
    return this.page;
  }

  // Prepare addresses for caching in localStorage
  dryAddresses () {
    const driedAddrs: any = {};
    const hasBTCAddrs = this.addresses.BTC && this.addresses.BTC.length > 0;
    const hasBTCChangeAddrs =
      this.addresses.BTC_CHANGE && this.addresses.BTC_CHANGE.length > 0;
    const BTC_PURPOSE = getBtcPurpose();
    if (BTC_PURPOSE === constants.BTC_PURPOSE_NONE) {
      // We cannot continue if the wallet is hidden
      return driedAddrs;
    }
    if (hasBTCAddrs) {
      driedAddrs.BTC = {};
      driedAddrs.BTC[BTC_PURPOSE] = this.addresses.BTC || [];
    }
    if (hasBTCChangeAddrs) {
      driedAddrs.BTC_CHANGE = {};
      driedAddrs.BTC_CHANGE[BTC_PURPOSE] = this.addresses.BTC_CHANGE || [];
    }
    return driedAddrs;
  }

  // Pull addresses out of cached localStorage data
  rehydrateAddresses (allAddrs: BtcAddresses = {} as any) {
    const rehydratedAddrs: any = {};
    const BTC_PURPOSE = getBtcPurpose();
    if (BTC_PURPOSE === constants.BTC_PURPOSE_NONE) {
      // We cannot continue if the wallet is hidden
      return rehydratedAddrs;
    }
    if (allAddrs.BTC) {
      rehydratedAddrs.BTC = allAddrs.BTC[BTC_PURPOSE];
    }
    if (allAddrs.BTC_CHANGE) {
      rehydratedAddrs.BTC_CHANGE = allAddrs.BTC_CHANGE[BTC_PURPOSE];
    }
    this.addresses = rehydratedAddrs;
  }

  saveBtcWalletData () {
    // This function should never be called without a deviceId
    // or StorageSession
    if (!this.deviceId || !this.storageSession) return;

    // Package data and save it
    // NOTE: We are only storing addresses at this point, as
    // the blockchain state needs to be up-to-date and is therefore
    // not very useful to store.
    const BTC_PURPOSE = getBtcPurpose();
    if (BTC_PURPOSE === constants.BTC_PURPOSE_NONE) {
      console.error("Cannot save BTC wallet data when wallet is hidden");
      return;
    }
    const walletData = {
      [constants.BTC_WALLET_STORAGE_KEY]: {
        [BTC_PURPOSE]: {
          addresses: this.dryAddresses(),
          btcTxs: this.btcTxs,
          btcUtxos: this.btcUtxos,
          lastFetchedBtcData: this.lastFetchedBtcData,
        },
        btcPrice: this.btcPrice,
      },
    };
    const activeWallet = this.client ? this.client.getActiveWallet() : null;
    if (this.client && activeWallet !== null) {
      const wallet_uid = activeWallet.uid.toString("hex");
      this.storageSession.save(this.deviceId, wallet_uid, walletData);
    }
  }

  getBtcWalletData () {
    // Create a storage session only if we have a deviceId and don't
    // have a current storage session
    if (this.deviceId && !this.storageSession)
      //@ts-expect-error
      this.storageSession = new StorageSession(this.deviceId);
    if (this.client) {
      // Make sure the btc wallet is enabled
      const BTC_PURPOSE = getBtcPurpose();
      if (BTC_PURPOSE === constants.BTC_PURPOSE_NONE) {
        return;
      }
      // If we have a client and if it has a non-zero active wallet UID,
      // lookup the addresses corresponding to that wallet UID in storage.
      const activeWallet = this.getActiveWallet();
      if (activeWallet === null) {
        // No active wallet -- reset addresses
        this.addresses = {} as any;
      } else {
        const uid = activeWallet.uid.toString("hex");
        // Rehydrate the data
        const data = this.storageSession.getWalletData(this.deviceId, uid);
        if (!data || !data[constants.BTC_WALLET_STORAGE_KEY]) return;
        const walletData = data[constants.BTC_WALLET_STORAGE_KEY];
        // Price is saved outside of the purpose sub-object
        if (walletData.btcPrice) {
          this.btcPrice = walletData.btcPrice;
        }
        // Unpack wallet data associated with the current btc purpose
        const purposeSpecificData = walletData[BTC_PURPOSE];
        if (!purposeSpecificData) return;
        if (purposeSpecificData.addresses) {
          this.rehydrateAddresses(purposeSpecificData.addresses);
        }
        if (purposeSpecificData.btcTxs) {
          this.btcTxs = purposeSpecificData.btcTxs;
        }
        if (purposeSpecificData.btcUtxos) {
          this.btcUtxos = purposeSpecificData.btcUtxos;
        }
        if (purposeSpecificData.lastFetchedBtcData) {
          this.lastFetchedBtcData = purposeSpecificData.lastFetchedBtcData;
        }
      }
    }
  }

  async refreshWallets () {
    if (this.client) {
      const prevWallet = JSON.stringify(this.client.getActiveWallet());
      await this.client.fetchActiveWallet()
      // const isPaired = await this.reconnect()
      // If we lost connection, the user most likely removed the pairing and will need to repair
      if (false === this.client.isPaired) throw new Error(constants.LOST_PAIRING_ERR);
      // If we pulled a new active wallet, reset balances + transactions
      // so we can reload a new set.
      const newWallet = JSON.stringify(this.client.getActiveWallet());
      if (newWallet !== prevWallet) this.resetStateData();
      // Update storage. This will remap to a new localStorage key if the wallet UID
      // changed. If we didn't get an active wallet, it will just clear out the addresses
      this.getBtcWalletData();
      return true
    } else {
      throw new Error("Lost connection to Lattice. Please refresh.");
    }
  }

  async sign (req) {
    // Get the tx payload to broadcast
    return this.client
      .sign(req)
      .then(res => {
        if (res && res.tx) {
          broadcastBtcTx(res.tx, (err, txid) => {
            if (err) throw new Error(`Error broadcasting transaction: ${err.message}`);
            return txid
          });
        } else {
          throw new Error('Signing transaction invalid.');
        }
      })
  }

  //----------------------------------------------------
  // NEW STUFF - REWRITING ADDRESS/DATA FETCHING FOR BTC WALLET
  //----------------------------------------------------

  // Get a set of either pending or confirmed transactions from the full
  // set of known BTC txs
  getBtcTxs (confirmed = true) {
    const txs: any[] = [];
    this.btcTxs.forEach((t) => {
      if (confirmed && t.confirmed) {
        txs.push(t);
      } else if (!confirmed && !t.confirmed) {
        txs.push(t);
      }
    });
    return txs;
  }

  // Get the set of known UTXOs belonging to our known set of BTC addresses
  getBtcUtxos () {
    return this.btcUtxos;
  }

  // Get the BTC balance, which is simply a sum of UTXO values
  // Returns the balance in satoshis
  getBtcBalance () {
    let balance = 0;
    this.btcUtxos.forEach((u) => {
      balance += u.value;
    });
    return balance;
  }

  // Fetch necessary addresses based on state data. We need to fetch addresses
  // for both BTC and BTC_CHANGE such that we have fetched GAP_LIMIT past the last
  // used address. An address is "used" if it has at least one transaction associated.
  // This function will automatically fetch both BTC and BTC_CHANGE addresses up to
  // the associated GAP_LIMITs and updates state internally.
  // Returns a callback containing params (error, numFetched), where `numFetched` is
  // the total number of *new* addresses we fetched. If this number is >0, it signifies
  // we should re-fetch transaction data for our new set of addresses.
  async fetchBtcAddresses (
    cb,
    isChange = false,
    totalFetched = { regular: 0, change: 0 }
  ) {
    const BTC_PURPOSE = getBtcPurpose();
    if (BTC_PURPOSE === constants.BTC_PURPOSE_NONE) {
      // We cannot continue if the wallet is hidden
      return cb("Cannot request BTC addresses while wallet is hidden.");
    }
    const lastUsedIdx = this._getLastUsedBtcAddrIdx(isChange);
    const currentAddrs =
      (isChange ? this.addresses.BTC_CHANGE : this.addresses.BTC) || [];
    const GAP_LIMIT = isChange
      ? constants.BTC_CHANGE_GAP_LIMIT
      : constants.BTC_MAIN_GAP_LIMIT;
    const targetIdx = lastUsedIdx + 1 + GAP_LIMIT;
    const maxToFetch = targetIdx - currentAddrs.length;
    const nToFetch = Math.min(constants.BTC_ADDR_BLOCK_LEN, maxToFetch);
    if (nToFetch > 0) {
      // If we have closed our gap limit we need to get more addresses
      const changeIdx = isChange ? 1 : 0;
      const opts = {
        startPath: [
          BTC_PURPOSE,
          constants.BTC_COIN,
          harden(0),
          changeIdx,
          currentAddrs.length,
        ],
        n: nToFetch,
        skipCache: true,
      };
      this._getAddresses(opts, (err, addresses) => {
        if (err) return cb(err);
        // Track the number of new addresses we fetched
        if (isChange) {
          totalFetched.change += nToFetch;
        } else {
          totalFetched.regular += nToFetch;
        }
        // Save the addresses to memory and also update them in localStorage
        // Note that we do need to track index here
        if (isChange) {
          this.addresses.BTC_CHANGE = currentAddrs.concat(addresses);
        } else {
          this.addresses.BTC = currentAddrs.concat(addresses);
        }
        // If we need to fetch more, recurse
        if (maxToFetch > nToFetch) {
          this.fetchBtcAddresses(cb, isChange, totalFetched);
        } else if (!isChange) {
          // If we are done fetching main BTC addresses, switch to the change path
          this.fetchBtcAddresses(cb, true, totalFetched);
        } else {
          this.saveBtcWalletData();
          cb(null, totalFetched);
        }
      });
    } else if (!isChange) {
      // If we are done fetching main BTC addresses, switch to the change path
      this.fetchBtcAddresses(cb, true, totalFetched);
    } else {
      // Nothing to fetch
      this.saveBtcWalletData();
      cb(null, totalFetched);
    }
  }

  // We want to clear UTXOs when we re-sync because they could have been spent.
  // Due to the nature of `fetchBtcStateData`, we need to append new UTXOs to
  // the existing set as we sync data, so it is best to call this function once
  // from the component that is starting the resync.
  clearUtxos () {
    this.btcUtxos = [];
  }

  // Fetch transactions and UTXOs for all known BTC addresses (including change)
  // Calls to appropriate Bitcoin data provider and updates state internally.
  // Returns a callback with params (error)
  async fetchBtcStateData (opts, cb, isChange = false, txs = [], utxos = []) {
    // Determine which addresses for which to fetch state.
    // If we get non-zero `opts` values it means this is a follow up call
    // and we only want to fetch data for new addresses we've collected
    // rather than data for all known addresses.
    let addrs =
      (isChange ? this.addresses.BTC_CHANGE : this.addresses.BTC) || [];
    if (opts && opts.regular > 0) {
      addrs = this.addresses.BTC.slice(-opts.regular);
      opts.regular = 0;
    } else if (opts && opts.change > 0) {
      // If we have new change addrs but not new regular addrs,
      // we can force a switch to change here so we don't re-scan
      // the same regular addresses we have already scanned.
      isChange = true;
      addrs = this.addresses.BTC_CHANGE.slice(-opts.change);
      opts.change = 0;
    }
    fetchBtcPrice((err, btcPrice) => {
      if (err) {
        // Don't fail out if we can't get the price - just display 0
        console.error("Failed to fetch price:", err);
        btcPrice = 0;
      }
      fetchBtcTxs(addrs, txs, (err, _txs) => {
        if (err) return cb(err);
        else if (!_txs) return cb("Failed to fetch transactions");
        txs = txs.concat(_txs);
        fetchBtcUtxos(addrs, (err, _utxos) => {
          if (err) return cb(err);
          else if (!_utxos) return cb("Failed to fetch UTXOs");
          utxos = utxos.concat(_utxos);
          if (!isChange) {
            // Once we get data for our BTC addresses, switch to change
            this.fetchBtcStateData(opts, cb, true, txs, utxos);
          } else {
            // All done! Filter/process data and save
            this.btcPrice = btcPrice;
            this.lastFetchedBtcData = Math.floor(Date.now());
            const newTxs = this.btcTxs.concat(txs);
            this.btcTxs = filterUniqueObjects(newTxs, ["id"]);
            this._processBtcTxs();
            const newUtxos = this.btcUtxos.concat(utxos);
            // UTXOs should already be filtered but it doesn't hurt to
            // do a sanity check filter here.
            this.btcUtxos = filterUniqueObjects(newUtxos, ["id", "vout"]).sort(
              (a, b) => {
                return b.value - a.value;
              }
            );
            this.saveBtcWalletData();
            cb(null);
          }
        });
      });
    });
  }

  // Generic caller to SDK getAddress route with retry mechanism
  async _getAddresses (opts, cb) {
    const addresses = await this.client.getAddresses(opts).catch((err) => {
      // Catch an error, but if the device is busy it probably means it is currently
      // caching a batch of new addresses. Continue the loop through this request until
      // it hits.
      if (err) {
        if (err === "Device Busy") {
          return this._getAddresses(opts, cb);
        } else {
          // To avoid concurrency problems on an initial sync, we need to wait
          // for the device to refresh addresses before completing the callback
          setTimeout(() => {
            return cb(err);
          }, 2000);
        }
      }
    });
    return cb(null, addresses);
  }

  // Get the highest index address that has been used for either BTC or BTC_CHANGE
  _getLastUsedBtcAddrIdx (change = false) {
    const coin = change ? "BTC_CHANGE" : "BTC";
    const addrs = this.addresses[coin] || [];
    const txs = this.btcTxs || [];
    let lastUsed = -1;
    for (let i = 0; i < txs.length; i++) {
      if (txs[i].confirmed) {
        let maxUsed = lastUsed;
        txs[i].inputs.forEach((input) => {
          if (addrs.indexOf(input.addr) > maxUsed)
            maxUsed = addrs.indexOf(input.addr);
        });
        txs[i].outputs.forEach((output) => {
          if (addrs.indexOf(output.addr) > maxUsed)
            maxUsed = addrs.indexOf(output.addr);
        });
        if (maxUsed > lastUsed) lastUsed = maxUsed;
      }
    }
    return lastUsed;
  }

  // Loop through known txs, determining value and recipient
  // based on known addresses.
  // Recipient should be the first address
  // If the recipient is one of our addresses, the transaction is inbound
  // If the transaction is inbound, value is SUM(outputs to our addresses)
  // If the transaction is outbound, value is SUM(inputs) - SUM(outputs to our addresses)
  _processBtcTxs () {
    const allAddrs = this.addresses.BTC.concat(this.addresses.BTC_CHANGE);
    const processedTxs: any[] = [];
    const txs = JSON.parse(JSON.stringify(this.btcTxs));
    txs.forEach((tx) => {
      // Determine if this is an outgoing transaction or not based on inputs.
      // We consider a transaction as "incoming" if *every* input was signed by
      // an external address.
      tx.incoming = tx.inputs.every(
        (input) => allAddrs.indexOf(input.addr) === -1
      );

      // Fill in the recipient. If this is an outgoing transaction, it will
      // always be the first output. Otherwise, we consider the recipient
      // to be the first address belonging to us that we can find in outputs.
      if (!tx.incoming) {
        tx.recipient = tx.outputs[0].addr;
      } else {
        tx.outputs.forEach((output) => {
          if (!tx.recipient && allAddrs.indexOf(output.addr) > -1) {
            // Mark the recipient as the first of our addresses we find
            tx.recipient = allAddrs[allAddrs.indexOf(output.addr)];
          }
        });
        if (!tx.recipient) {
          // Fallback to the first output. This should not be possible after
          // the loop above.
          tx.recipient = tx.outputs[0].addr;
        }
      }

      // Calculate the value of the transaction to display in our history
      tx.value = 0;
      if (!tx.incoming) {
        // Outgoing tx: sum(outputs to external addrs)
        let inputSum = 0;
        tx.inputs.forEach((input) => {
          inputSum += input.value;
        });
        let internalOutputSum = 0;
        let externalOutputSum = 0;
        tx.outputs.forEach((output) => {
          if (allAddrs.indexOf(output.addr) > -1) {
            internalOutputSum += output.value;
          } else {
            externalOutputSum += output.value;
          }
        });
        if (inputSum === internalOutputSum + tx.fee) {
          // Edge case: sent to internal address, i.e. internal transaction
          tx.value = 0;
        } else {
          tx.value = externalOutputSum;
        }
      } else {
        // Incoming tx: sum(outputs to internal addrs)
        tx.outputs.forEach((output) => {
          if (allAddrs.indexOf(output.addr) > -1) {
            tx.value += output.value;
          }
        });
      }
      processedTxs.push(tx);
    });
    const sortedTxs = processedTxs.sort((a, b) => {
      return b.timestamp - a.timestamp;
    });
    this.btcTxs = sortedTxs;
  }
}

export default BitcoinSession;
