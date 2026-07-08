import { describe, it, expect } from "vitest";
import { createWalletClient, http, verifyTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createPayment, hashResource } from "../src/client";
import { decodePaymentHeader } from "../src/encoding";
import {
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  VOUCHER_TYPES,
  type PaymentRequirements,
} from "../src/types";

const account = privateKeyToAccount(
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
);
const wallet = createWalletClient({ account, transport: http("http://localhost:0") });

const requirements: PaymentRequirements = {
  scheme: "escrow",
  network: "arc-testnet",
  chainId: 5042002,
  amount: "10000",
  payTo: "0x2222222222222222222222222222222222222222",
  asset: "0x3600000000000000000000000000000000000000",
  gateway: "0x049914870eF36AbC7c92E390937A012bEd1E1ec3",
  resource: "GET /api/premium",
  maxTimeoutSeconds: 300,
};

describe("hashResource", () => {
  it("is deterministic and distinct per resource", () => {
    expect(hashResource("a")).toBe(hashResource("a"));
    expect(hashResource("a")).not.toBe(hashResource("b"));
  });
});

describe("createPayment", () => {
  it("signs a voucher that recovers to the buyer", async () => {
    const { payload, header } = await createPayment({ wallet, account, requirements });

    expect(payload.voucher.buyer).toBe(account.address);
    expect(payload.voucher.seller).toBe(requirements.payTo);
    expect(payload.voucher.amount).toBe("10000");
    expect(decodePaymentHeader(header)).toEqual(payload);

    const valid = await verifyTypedData({
      address: account.address,
      domain: {
        name: EIP712_DOMAIN_NAME,
        version: EIP712_DOMAIN_VERSION,
        chainId: requirements.chainId,
        verifyingContract: requirements.gateway,
      },
      types: VOUCHER_TYPES,
      primaryType: "Voucher",
      message: {
        buyer: payload.voucher.buyer,
        seller: payload.voucher.seller,
        amount: BigInt(payload.voucher.amount),
        resourceId: payload.voucher.resourceId,
        nonce: BigInt(payload.voucher.nonce),
        deadline: BigInt(payload.voucher.deadline),
      },
      signature: payload.signature,
    });
    expect(valid).toBe(true);
  });

  it("uses a random nonce by default", async () => {
    const a = await createPayment({ wallet, account, requirements });
    const b = await createPayment({ wallet, account, requirements });
    expect(a.payload.voucher.nonce).not.toBe(b.payload.voucher.nonce);
  });
});
