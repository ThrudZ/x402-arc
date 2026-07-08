import { defineChain, type Chain, getAddress, type Address } from "viem";

/**
 * Arc is Circle's L1 where USDC is the native asset. The concrete chain id,
 * RPC URL and canonical USDC address are network parameters, so we keep them
 * out of the source and require the integrator to supply them. Fill these from
 * the Arc network docs / your deployment, never hardcode a guessed value.
 */
export interface ArcNetworkParams {
  chainId: number;
  rpcUrl: string;
  /** Canonical USDC token address on this Arc network. */
  usdc: Address;
  /** Deployed EscrowPaymentGateway address. */
  gateway: Address;
  name?: string;
  explorerUrl?: string;
}

export function defineArcChain(params: ArcNetworkParams): Chain {
  return defineChain({
    id: params.chainId,
    name: params.name ?? `Arc ${params.chainId}`,
    nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
    rpcUrls: { default: { http: [params.rpcUrl] } },
    blockExplorers: params.explorerUrl
      ? { default: { name: "Explorer", url: params.explorerUrl } }
      : undefined,
  });
}

/**
 * Reads Arc params from environment variables. Throws early with a clear
 * message rather than silently defaulting to a wrong network.
 */
export function arcParamsFromEnv(
  env: Record<string, string | undefined> = process.env,
): ArcNetworkParams {
  const chainId = env.ARC_CHAIN_ID;
  const rpcUrl = env.ARC_RPC_URL;
  const usdc = env.ARC_USDC_ADDRESS;
  const gateway = env.ARC_GATEWAY_ADDRESS;

  const missing = Object.entries({
    ARC_CHAIN_ID: chainId,
    ARC_RPC_URL: rpcUrl,
    ARC_USDC_ADDRESS: usdc,
    ARC_GATEWAY_ADDRESS: gateway,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(`Missing Arc network env vars: ${missing.join(", ")}`);
  }

  return {
    chainId: Number(chainId),
    rpcUrl: rpcUrl!,
    usdc: getAddress(usdc!),
    gateway: getAddress(gateway!),
    name: env.ARC_CHAIN_NAME,
    explorerUrl: env.ARC_EXPLORER_URL,
  };
}
