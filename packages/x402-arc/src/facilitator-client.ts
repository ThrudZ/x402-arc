import type { PaymentPayload, PaymentRequirements, SettlementResponse } from "./types";

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  /** Recovered buyer address when valid. */
  buyer?: string;
}

/**
 * A facilitator verifies buyer signatures / escrow balance and settles vouchers
 * on-chain. Implemented locally (in the `facilitator` package) or proxied over
 * HTTP to a remote facilitator service.
 */
export interface Facilitator {
  verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<VerifyResult>;
  settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<SettlementResponse>;
}

/** Talks to a remote facilitator over HTTP. */
export function httpFacilitator(baseUrl: string, headers: Record<string, string> = {}): Facilitator {
  const post = async <T>(path: string, body: unknown): Promise<T> => {
    const res = await fetch(new URL(path, baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`facilitator ${path} failed: ${res.status}`);
    }
    return (await res.json()) as T;
  };

  return {
    verify: (payload, requirements) =>
      post<VerifyResult>("/verify", { payload, requirements }),
    settle: (payload, requirements) =>
      post<SettlementResponse>("/settle", { payload, requirements }),
  };
}
