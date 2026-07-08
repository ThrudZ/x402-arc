import type { Address, Hex } from "viem";

/** x402 payment scheme implemented by this gateway. */
export const SCHEME = "escrow" as const;
export const X402_VERSION = 1 as const;

/**
 * Returned to the client inside the `402` body under `accepts`. Tells the
 * client how to construct a payment for this resource.
 */
export interface PaymentRequirements {
  scheme: typeof SCHEME;
  network: string; // e.g. "arc" or "arc-testnet"
  chainId: number;
  /** Amount in USDC base units (6 decimals), as a string to avoid precision loss. */
  amount: string;
  /** Seller receiving the funds. */
  payTo: Address;
  /** USDC token address. */
  asset: Address;
  /** Deployed EscrowPaymentGateway address. */
  gateway: Address;
  /** Opaque resource identifier, hashed into the voucher. */
  resource: string;
  /** Unix seconds after which a voucher for this resource is invalid. */
  maxTimeoutSeconds: number;
  /** Human description shown to the payer. */
  description?: string;
}

export interface Response402 {
  x402Version: typeof X402_VERSION;
  error: string;
  accepts: PaymentRequirements[];
}

/** The EIP-712 voucher matching EscrowPaymentGateway.Voucher. */
export interface Voucher {
  buyer: Address;
  seller: Address;
  amount: string;
  resourceId: Hex;
  nonce: string;
  deadline: string;
}

/** Decoded contents of the `X-PAYMENT` header. */
export interface PaymentPayload {
  x402Version: typeof X402_VERSION;
  scheme: typeof SCHEME;
  network: string;
  voucher: Voucher;
  signature: Hex;
}

/** Returned in `X-PAYMENT-RESPONSE` after settlement. */
export interface SettlementResponse {
  success: boolean;
  txHash?: Hex;
  networkId?: number;
  error?: string;
}

export const EIP712_DOMAIN_NAME = "EscrowPaymentGateway";
export const EIP712_DOMAIN_VERSION = "1";

export const VOUCHER_TYPES = {
  Voucher: [
    { name: "buyer", type: "address" },
    { name: "seller", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "resourceId", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;
