import { defineArcChain, type ArcNetworkParams } from "x402-arc";
import { getAddress } from "viem";

// Next.js only inlines NEXT_PUBLIC_* into the client bundle when referenced
// statically (process.env.NEXT_PUBLIC_FOO), never via a dynamic key. So each
// var is read by its literal name here.
function req(v: string | undefined, key: string): string {
  if (!v) throw new Error(`Missing ${key} (set it in web/.env.local)`);
  return v;
}

export const arcParams: ArcNetworkParams = {
  chainId: Number(req(process.env.NEXT_PUBLIC_ARC_CHAIN_ID, "NEXT_PUBLIC_ARC_CHAIN_ID")),
  rpcUrl: req(process.env.NEXT_PUBLIC_ARC_RPC_URL, "NEXT_PUBLIC_ARC_RPC_URL"),
  usdc: getAddress(req(process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS, "NEXT_PUBLIC_ARC_USDC_ADDRESS")),
  gateway: getAddress(
    req(process.env.NEXT_PUBLIC_ARC_GATEWAY_ADDRESS, "NEXT_PUBLIC_ARC_GATEWAY_ADDRESS"),
  ),
  name: process.env.NEXT_PUBLIC_ARC_CHAIN_NAME ?? "Arc",
  explorerUrl: process.env.NEXT_PUBLIC_ARC_EXPLORER_URL,
};

export const arcChain = defineArcChain(arcParams);

/** Minimal ABIs the client needs. */
export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const gatewayAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "deposits",
    stateMutability: "view",
    inputs: [{ name: "buyer", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
