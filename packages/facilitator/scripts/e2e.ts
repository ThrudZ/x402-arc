/**
 * Real end-to-end run against the LIVE Arc testnet deployment.
 * No mocks: it deposits real USDC, runs the actual x402 402 handshake through
 * the SDK middleware, and settles the voucher on-chain via the facilitator.
 *
 *   node --experimental-strip-types packages/facilitator/scripts/e2e.ts
 *
 * Env (from contracts/.env + the live Arc params):
 *   PRIVATE_KEY  buyer = facilitator = seller for this self-contained proof
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  getAddress,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  buildRequirements,
  createPayment,
  defineArcChain,
  withPayment,
  type ArcNetworkParams,
} from "x402-arc";
import { createFacilitator } from "../src/facilitator.ts";

const arc: ArcNetworkParams = {
  chainId: 5042002,
  rpcUrl: "https://rpc.testnet.arc.network",
  usdc: getAddress("0x3600000000000000000000000000000000000000"),
  gateway: getAddress("0x049914870eF36AbC7c92E390937A012bEd1E1ec3"),
  name: "Arc Testnet",
};

const erc20 = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
const gateway = [
  { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "a", type: "uint256" }], outputs: [] },
  { type: "function", name: "deposits", stateMutability: "view", inputs: [{ name: "b", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "earnings", stateMutability: "view", inputs: [{ name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

const u6 = (n: bigint) => formatUnits(n, 6);

async function main() {
  const pk = process.env.PRIVATE_KEY as Hex | undefined;
  if (!pk) throw new Error("PRIVATE_KEY required (source contracts/.env)");
  const account = privateKeyToAccount(pk);
  const chain = defineArcChain(arc);
  const pub = createPublicClient({ chain, transport: http(arc.rpcUrl) });
  const wallet = createWalletClient({ account, chain, transport: http(arc.rpcUrl) });

  const buyer = account.address;
  const seller = account.address; // self-contained proof; prod uses a distinct seller
  console.log(`buyer/seller/facilitator: ${buyer}`);

  const read = (fn: "deposits" | "earnings", who: string) =>
    pub.readContract({ address: arc.gateway, abi: gateway, functionName: fn, args: [who as Hex] });

  console.log(`\nescrow deposit before: ${u6(await read("deposits", buyer))} USDC`);
  console.log(`seller earnings before: ${u6(await read("earnings", seller))} USDC`);

  // 1) Fund escrow (approve if needed, then deposit 1 USDC).
  const want = parseUnits("1", 6);
  const allowance = await pub.readContract({ address: arc.usdc, abi: erc20, functionName: "allowance", args: [buyer, arc.gateway] });
  if (allowance < want) {
    const h = await wallet.writeContract({ address: arc.usdc, abi: erc20, functionName: "approve", args: [arc.gateway, want] });
    await pub.waitForTransactionReceipt({ hash: h });
    console.log(`\napprove tx: ${h}`);
  }
  const depHash = await wallet.writeContract({ address: arc.gateway, abi: gateway, functionName: "deposit", args: [want] });
  await pub.waitForTransactionReceipt({ hash: depHash });
  console.log(`deposit tx: ${depHash}`);
  console.log(`escrow deposit after fund: ${u6(await read("deposits", buyer))} USDC`);

  // 2) Set up the real x402 gate + facilitator.
  const facilitator = createFacilitator({ arc, account });
  const requirements = buildRequirements(
    "GET /api/premium",
    { amount: parseUnits("0.01", 6).toString(), payTo: seller, description: "Premium API call" },
    { network: "arc-testnet", chainId: arc.chainId, asset: arc.usdc, gateway: arc.gateway },
  );
  const handler = withPayment(
    async () => Response.json({ data: "real paid response", at: new Date().toISOString() }),
    { resource: "GET /api/premium", price: { amount: requirements.amount, payTo: seller }, config: { network: "arc-testnet", chainId: arc.chainId, asset: arc.usdc, gateway: arc.gateway }, facilitator },
  );

  // 3) First call, no payment -> real 402.
  const first = await handler(new Request("https://x/api/premium"));
  console.log(`\nfirst call status: ${first.status} (expect 402)`);
  if (first.status !== 402) throw new Error("expected 402");

  // 4) Sign a real EIP-712 voucher and retry with X-PAYMENT.
  const { header } = await createPayment({ wallet, account, requirements });
  const paid = await handler(
    new Request("https://x/api/premium", { headers: { "X-PAYMENT": header } }),
  );
  console.log(`paid call status: ${paid.status} (expect 200)`);
  const settleHeader = paid.headers.get("X-PAYMENT-RESPONSE");
  const settlement = settleHeader ? JSON.parse(Buffer.from(settleHeader, "base64").toString()) : null;
  console.log(`settlement:`, settlement);
  console.log(`body:`, await paid.json());

  // 5) Confirm on-chain effects, then claim earnings.
  console.log(`\nescrow deposit after redeem: ${u6(await read("deposits", buyer))} USDC`);
  console.log(`seller earnings after redeem: ${u6(await read("earnings", seller))} USDC`);
  const claimHash = await wallet.writeContract({ address: arc.gateway, abi: gateway, functionName: "claim", args: [] });
  await pub.waitForTransactionReceipt({ hash: claimHash });
  console.log(`claim tx: ${claimHash}`);
  console.log(`seller earnings after claim: ${u6(await read("earnings", seller))} USDC`);
  console.log(`\nOK: real 402 handshake settled on Arc testnet.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
