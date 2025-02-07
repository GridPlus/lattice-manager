import { PublicKey } from "@solana/web3.js";
import { Constants } from "gridplus-sdk";
const { GET_ADDR_FLAGS } = Constants;

export const DERIVATION_TYPE = {
  BITCOIN_LEGACY: "Bitcoin (Legacy)",
  BITCOIN_SEGWIT: "Bitcoin (Segwit)",
  BITCOIN_WRAPPED_SEGWIT: "Bitcoin (Wrapped Segwit)",
  BITCOIN_XPUB: "Bitcoin (XPUB)",
  ETHEREUM: "Ethereum",
  SOLANA: "Solana",
};

type DerivationType = typeof DERIVATION_TYPE[keyof typeof DERIVATION_TYPE];

/**
 * Takes a string and DerivationType and returns a formatted string for display.
 */
export const getDisplayStringForDerivationType = (
  data: string,
  derivationType: DerivationType
) => {
  switch (derivationType) {
    case DERIVATION_TYPE.SOLANA:
      // Formatted Solana address
      return new PublicKey(data).toString();
    case DERIVATION_TYPE.BITCOIN_XPUB:
      // Return raw XPUB string
      return data;
    default:
      // Formatted address
      return data;
  }
};

/**
 * Returns a UInt4 flag for a given derivation type.
 */
export const getFlagForDerivationType = (derivationType: DerivationType) => {
  switch (derivationType) {
    case DERIVATION_TYPE.SOLANA:
      return GET_ADDR_FLAGS.ED25519_PUB;
    case DERIVATION_TYPE.BITCOIN_XPUB:
      return GET_ADDR_FLAGS.SECP256K1_XPUB;
    default:
      return undefined;
  }
};
