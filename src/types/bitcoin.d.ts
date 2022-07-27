
type BtcData = {
  [deviceId: string]: {
    [address: string]: {
      btc_wallet: {
        [key: string]: {
          addresses: {
            BTC: {
              [key: string]: string[],
            },
            BTC_CHANGE: {
              [key: string]: string[],
            },
          },
          btcTxs: [],
          btcUtxos: [],
          lastFetchedBtcData: number,
        } & {
          btcPrice: number,
        }
      },
    },
  },
};

type BtcAddresses = {
  BTC: string[],
  BTC_CHANGE: string[],
}