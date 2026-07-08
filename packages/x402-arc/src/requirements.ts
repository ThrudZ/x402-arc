import type { Address } from "viem";
import { SCHEME, X402_VERSION, type PaymentRequirements, type Response402 } from "./types";

export interface RoutePrice {
  /** USDC amount in base units (6 decimals) as a string, e.g. "10000" = 0.01 USDC. */
  amount: string;
  payTo: Address;
  description?: string;
}

export interface RequirementsConfig {
  network: string;
  chainId: number;
  asset: Address;
  gateway: Address;
  /** Default voucher validity window in seconds. */
  maxTimeoutSeconds?: number;
}

export function buildRequirements(
  resource: string,
  price: RoutePrice,
  cfg: RequirementsConfig,
): PaymentRequirements {
  return {
    scheme: SCHEME,
    network: cfg.network,
    chainId: cfg.chainId,
    amount: price.amount,
    payTo: price.payTo,
    asset: cfg.asset,
    gateway: cfg.gateway,
    resource,
    maxTimeoutSeconds: cfg.maxTimeoutSeconds ?? 300,
    description: price.description,
  };
}

export function build402Body(
  requirements: PaymentRequirements[],
  error = "Payment required",
): Response402 {
  return { x402Version: X402_VERSION, error, accepts: requirements };
}
