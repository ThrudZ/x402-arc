import {
  keccak256,
  toHex,
  type Address,
  type Hex,
  type WalletClient,
  type Account,
} from "viem";
import {
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  SCHEME,
  VOUCHER_TYPES,
  X402_VERSION,
  type PaymentPayload,
  type PaymentRequirements,
  type Voucher,
} from "./types";
import { encodePaymentHeader } from "./encoding";

/** Deterministic resourceId (bytes32) from the resource string. */
export function hashResource(resource: string): Hex {
  return keccak256(toHex(resource));
}

/** Random uint256 nonce as a decimal string. */
function randomNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let hex = "0x";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return BigInt(hex).toString();
}

export interface SignVoucherArgs {
  wallet: WalletClient;
  account: Account | Address;
  requirements: PaymentRequirements;
  /** Override nonce (defaults to random). */
  nonce?: string;
}

/**
 * Signs an EIP-712 voucher for the given payment requirements and returns the
 * value ready to be placed in the `X-PAYMENT` header.
 */
export async function createPayment(args: SignVoucherArgs): Promise<{
  payload: PaymentPayload;
  header: string;
}> {
  const { wallet, account, requirements } = args;
  const buyer = (typeof account === "string" ? account : account.address) as Address;

  const deadline = BigInt(Math.floor(Date.now() / 1000) + requirements.maxTimeoutSeconds);
  const voucher: Voucher = {
    buyer,
    seller: requirements.payTo,
    amount: requirements.amount,
    resourceId: hashResource(requirements.resource),
    nonce: args.nonce ?? randomNonce(),
    deadline: deadline.toString(),
  };

  const signature = await wallet.signTypedData({
    account,
    domain: {
      name: EIP712_DOMAIN_NAME,
      version: EIP712_DOMAIN_VERSION,
      chainId: requirements.chainId,
      verifyingContract: requirements.gateway,
    },
    types: VOUCHER_TYPES,
    primaryType: "Voucher",
    message: {
      buyer: voucher.buyer,
      seller: voucher.seller,
      amount: BigInt(voucher.amount),
      resourceId: voucher.resourceId,
      nonce: BigInt(voucher.nonce),
      deadline: BigInt(voucher.deadline),
    },
  });

  const payload: PaymentPayload = {
    x402Version: X402_VERSION,
    scheme: SCHEME,
    network: requirements.network,
    voucher,
    signature,
  };

  return { payload, header: encodePaymentHeader(payload) };
}

/**
 * Wraps fetch: on a 402, reads the requirements, signs a voucher and retries
 * once with the `X-PAYMENT` header. Mirrors the x402 client convention.
 */
export function wrapFetchWithPayment(
  fetchImpl: typeof fetch,
  signer: Omit<SignVoucherArgs, "requirements">,
): typeof fetch {
  return async (input, init) => {
    const first = await fetchImpl(input, init);
    if (first.status !== 402) return first;

    const body = await first.clone().json();
    const requirements: PaymentRequirements | undefined = body?.accepts?.[0];
    if (!requirements) return first;

    const { header } = await createPayment({ ...signer, requirements });
    const headers = new Headers(init?.headers);
    headers.set("X-PAYMENT", header);
    return fetchImpl(input, { ...init, headers });
  };
}
