import { getAddress } from "viem";
import { httpFacilitator, type RequirementsConfig } from "x402-arc";

/** Server-side x402 config, read from env. See .env.example. */
export function x402Config(): RequirementsConfig {
  return {
    network: process.env.ARC_CHAIN_NAME ?? "arc",
    chainId: Number(reqEnv("ARC_CHAIN_ID")),
    asset: getAddress(reqEnv("ARC_USDC_ADDRESS")),
    gateway: getAddress(reqEnv("ARC_GATEWAY_ADDRESS")),
    maxTimeoutSeconds: 300,
  };
}

export function facilitator() {
  return httpFacilitator(reqEnv("FACILITATOR_URL"));
}

export const SELLER_ADDRESS = () => getAddress(reqEnv("SELLER_ADDRESS"));

function reqEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}
