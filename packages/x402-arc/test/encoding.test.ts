import { describe, it, expect } from "vitest";
import { decodePaymentHeader, encodePaymentHeader } from "../src/encoding";
import { SCHEME, X402_VERSION, type PaymentPayload } from "../src/types";

const payload: PaymentPayload = {
  x402Version: X402_VERSION,
  scheme: SCHEME,
  network: "arc-testnet",
  voucher: {
    buyer: "0x1Ce85622329Ac630E4c658e70e49876E10a1C9c9",
    seller: "0x1Ce85622329Ac630E4c658e70e49876E10a1C9c9",
    amount: "10000",
    resourceId: "0x1234567890123456789012345678901234567890123456789012345678901234",
    nonce: "42",
    deadline: "1893456000",
  },
  signature: "0xabc",
};

describe("payment header encoding", () => {
  it("round-trips a payload through base64", () => {
    const header = encodePaymentHeader(payload);
    expect(header).not.toContain("{");
    expect(decodePaymentHeader(header)).toEqual(payload);
  });

  it("produces a header that is valid base64 JSON", () => {
    const header = encodePaymentHeader(payload);
    const json = Buffer.from(header, "base64").toString("utf8");
    expect(JSON.parse(json).scheme).toBe(SCHEME);
  });
});
