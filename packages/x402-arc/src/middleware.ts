import { decodePaymentHeader, encodeJsonHeader } from "./encoding";
import type { Facilitator } from "./facilitator-client";
import { build402Body, buildRequirements, type RequirementsConfig, type RoutePrice } from "./requirements";

export interface PaymentGateOptions {
  /** Stable identifier for the protected resource (goes into the voucher). */
  resource: string;
  price: RoutePrice;
  config: RequirementsConfig;
  facilitator: Facilitator;
  /**
   * When true (default) the voucher is settled on-chain before the handler
   * runs. Set false to only verify (redeem asynchronously / off the hot path).
   */
  settleBeforeResponse?: boolean;
}

type RouteHandler = (req: Request, ctx?: unknown) => Promise<Response> | Response;

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/**
 * Wraps a Next.js App Router / Web `Request` handler with an x402 escrow gate.
 * Returns 402 with payment requirements when no valid payment is present,
 * otherwise verifies (and optionally settles) before invoking the handler.
 */
export function withPayment(handler: RouteHandler, opts: PaymentGateOptions): RouteHandler {
  const requirements = buildRequirements(opts.resource, opts.price, opts.config);
  const settle = opts.settleBeforeResponse ?? true;

  return async (req, ctx) => {
    const header = req.headers.get("x-payment");
    if (!header) {
      return json(build402Body([requirements]), 402);
    }

    let payload;
    try {
      payload = decodePaymentHeader(header);
    } catch {
      return json(build402Body([requirements], "Malformed X-PAYMENT header"), 402);
    }

    const verify = await opts.facilitator.verify(payload, requirements);
    if (!verify.valid) {
      return json(build402Body([requirements], verify.reason ?? "Invalid payment"), 402);
    }

    let settlementHeader: Record<string, string> = {};
    if (settle) {
      const result = await opts.facilitator.settle(payload, requirements);
      if (!result.success) {
        return json(build402Body([requirements], result.error ?? "Settlement failed"), 402);
      }
      settlementHeader = { "X-PAYMENT-RESPONSE": encodeJsonHeader(result) };
    }

    const res = await handler(req, ctx);
    const merged = new Headers(res.headers);
    for (const [k, v] of Object.entries(settlementHeader)) merged.set(k, v);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: merged });
  };
}
