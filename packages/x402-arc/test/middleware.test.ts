import { describe, it, expect } from "vitest";
import { withPayment } from "../src/middleware";
import { encodePaymentHeader } from "../src/encoding";
import type { Facilitator } from "../src/facilitator-client";
import { SCHEME, X402_VERSION, type PaymentPayload } from "../src/types";

const cfg = {
  network: "arc-testnet",
  chainId: 5042002,
  asset: "0x3600000000000000000000000000000000000000",
  gateway: "0x049914870eF36AbC7c92E390937A012bEd1E1ec3",
} as const;

const price = { amount: "10000", payTo: "0x2222222222222222222222222222222222222222" } as const;

const okFacilitator: Facilitator = {
  verify: async () => ({ valid: true }),
  settle: async () => ({ success: true, txHash: "0xdead", networkId: 5042002 }),
};

function paymentHeader(): string {
  const payload: PaymentPayload = {
    x402Version: X402_VERSION,
    scheme: SCHEME,
    network: "arc-testnet",
    voucher: {
      buyer: "0x1111111111111111111111111111111111111111",
      seller: price.payTo,
      amount: price.amount,
      resourceId: "0x" + "12".repeat(32),
      nonce: "1",
      deadline: "1893456000",
    },
    signature: "0xsig",
  };
  return encodePaymentHeader(payload);
}

const handler = () => Response.json({ data: "paid" });

describe("withPayment", () => {
  it("returns 402 with requirements when no payment is present", async () => {
    const gated = withPayment(handler, { resource: "r", price, config: cfg, facilitator: okFacilitator });
    const res = await gated(new Request("https://x/r"));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.accepts[0].amount).toBe("10000");
  });

  it("settles and returns 200 with X-PAYMENT-RESPONSE on a valid payment", async () => {
    const gated = withPayment(handler, { resource: "r", price, config: cfg, facilitator: okFacilitator });
    const res = await gated(new Request("https://x/r", { headers: { "X-PAYMENT": paymentHeader() } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-PAYMENT-RESPONSE")).toBeTruthy();
    expect((await res.json()).data).toBe("paid");
  });

  it("returns 402 when verification fails", async () => {
    const bad: Facilitator = { verify: async () => ({ valid: false, reason: "nope" }), settle: okFacilitator.settle };
    const gated = withPayment(handler, { resource: "r", price, config: cfg, facilitator: bad });
    const res = await gated(new Request("https://x/r", { headers: { "X-PAYMENT": paymentHeader() } }));
    expect(res.status).toBe(402);
    expect((await res.json()).error).toBe("nope");
  });

  it("returns 402 on a malformed X-PAYMENT header", async () => {
    const gated = withPayment(handler, { resource: "r", price, config: cfg, facilitator: okFacilitator });
    const res = await gated(new Request("https://x/r", { headers: { "X-PAYMENT": "!!!not-base64-json" } }));
    expect(res.status).toBe(402);
  });
});
