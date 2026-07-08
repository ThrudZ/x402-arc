import type { PaymentPayload } from "./types";

/** X-PAYMENT and X-PAYMENT-RESPONSE carry base64-encoded JSON. */
export function encodePaymentHeader(payload: PaymentPayload): string {
  const json = JSON.stringify(payload);
  return typeof Buffer !== "undefined"
    ? Buffer.from(json, "utf8").toString("base64")
    : btoa(json);
}

export function decodePaymentHeader(header: string): PaymentPayload {
  const json =
    typeof Buffer !== "undefined"
      ? Buffer.from(header, "base64").toString("utf8")
      : atob(header);
  return JSON.parse(json) as PaymentPayload;
}

export function encodeJsonHeader(value: unknown): string {
  const json = JSON.stringify(value);
  return typeof Buffer !== "undefined"
    ? Buffer.from(json, "utf8").toString("base64")
    : btoa(json);
}
