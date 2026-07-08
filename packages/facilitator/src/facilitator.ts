import {
  createPublicClient,
  createWalletClient,
  http,
  verifyTypedData,
  type Account,
  type Hex,
} from "viem";
import {
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  VOUCHER_TYPES,
  defineArcChain,
  hashResource,
  type ArcNetworkParams,
  type Facilitator,
  type PaymentPayload,
  type PaymentRequirements,
  type SettlementResponse,
  type VerifyResult,
} from "x402-arc";
import { gatewayAbi } from "./abi";

export interface FacilitatorConfig {
  arc: ArcNetworkParams;
  /** Account that submits redeem transactions (pays gas in USDC on Arc). */
  account: Account;
}

function voucherTuple(p: PaymentPayload) {
  const v = p.voucher;
  return {
    buyer: v.buyer,
    seller: v.seller,
    amount: BigInt(v.amount),
    resourceId: v.resourceId,
    nonce: BigInt(v.nonce),
    deadline: BigInt(v.deadline),
  };
}

export function createFacilitator(cfg: FacilitatorConfig): Facilitator {
  const chain = defineArcChain(cfg.arc);
  const publicClient = createPublicClient({ chain, transport: http(cfg.arc.rpcUrl) });
  const walletClient = createWalletClient({ chain, account: cfg.account, transport: http(cfg.arc.rpcUrl) });

  async function verify(
    payload: PaymentPayload,
    requirements: PaymentRequirements,
  ): Promise<VerifyResult> {
    const v = payload.voucher;

    // 1. Requirements must match what the server asked for.
    if (v.seller.toLowerCase() !== requirements.payTo.toLowerCase())
      return { valid: false, reason: "seller mismatch" };
    if (v.amount !== requirements.amount)
      return { valid: false, reason: "amount mismatch" };
    if (v.resourceId !== hashResource(requirements.resource))
      return { valid: false, reason: "resource mismatch" };
    if (Number(v.deadline) < Math.floor(Date.now() / 1000))
      return { valid: false, reason: "voucher expired" };

    // 2. Signature must recover to the buyer.
    const ok = await verifyTypedData({
      address: v.buyer,
      domain: {
        name: EIP712_DOMAIN_NAME,
        version: EIP712_DOMAIN_VERSION,
        chainId: requirements.chainId,
        verifyingContract: requirements.gateway,
      },
      types: VOUCHER_TYPES,
      primaryType: "Voucher",
      message: {
        buyer: v.buyer,
        seller: v.seller,
        amount: BigInt(v.amount),
        resourceId: v.resourceId,
        nonce: BigInt(v.nonce),
        deadline: BigInt(v.deadline),
      },
      signature: payload.signature,
    });
    if (!ok) return { valid: false, reason: "bad signature" };

    // 3. Escrow must hold enough and the voucher must be unused.
    const [deposit, digest] = await Promise.all([
      publicClient.readContract({
        address: requirements.gateway,
        abi: gatewayAbi,
        functionName: "deposits",
        args: [v.buyer],
      }),
      publicClient.readContract({
        address: requirements.gateway,
        abi: gatewayAbi,
        functionName: "voucherDigest",
        args: [voucherTuple(payload)],
      }),
    ]);
    if (deposit < BigInt(v.amount))
      return { valid: false, reason: "insufficient escrow balance" };

    const used = await publicClient.readContract({
      address: requirements.gateway,
      abi: gatewayAbi,
      functionName: "redeemed",
      args: [digest as Hex],
    });
    if (used) return { valid: false, reason: "voucher already redeemed" };

    return { valid: true, buyer: v.buyer };
  }

  async function settle(
    payload: PaymentPayload,
    requirements: PaymentRequirements,
  ): Promise<SettlementResponse> {
    const check = await verify(payload, requirements);
    if (!check.valid) return { success: false, error: check.reason };

    try {
      const hash = await walletClient.writeContract({
        address: requirements.gateway,
        abi: gatewayAbi,
        functionName: "redeem",
        args: [voucherTuple(payload), payload.signature],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success")
        return { success: false, txHash: hash, error: "redeem reverted" };
      return { success: true, txHash: hash, networkId: requirements.chainId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return { verify, settle };
}
