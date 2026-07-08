import { describe, it, expect } from "vitest";
import { buildRequirements, build402Body } from "../src/requirements";
import { SCHEME, X402_VERSION } from "../src/types";

const cfg = {
  network: "arc-testnet",
  chainId: 5042002,
  asset: "0x3600000000000000000000000000000000000000",
  gateway: "0x049914870eF36AbC7c92E390937A012bEd1E1ec3",
} as const;

describe("buildRequirements", () => {
  it("carries price and config into the requirements", () => {
    const r = buildRequirements(
      "GET /api/premium",
      { amount: "10000", payTo: "0x1Ce85622329Ac630E4c658e70e49876E10a1C9c9" },
      cfg,
    );
    expect(r.scheme).toBe(SCHEME);
    expect(r.amount).toBe("10000");
    expect(r.resource).toBe("GET /api/premium");
    expect(r.chainId).toBe(5042002);
    expect(r.gateway).toBe(cfg.gateway);
  });

  it("defaults maxTimeoutSeconds to 300", () => {
    const r = buildRequirements("r", { amount: "1", payTo: cfg.gateway }, cfg);
    expect(r.maxTimeoutSeconds).toBe(300);
  });
});

describe("build402Body", () => {
  it("wraps requirements with the x402 version and error", () => {
    const r = buildRequirements("r", { amount: "1", payTo: cfg.gateway }, cfg);
    const body = build402Body([r], "Payment required");
    expect(body.x402Version).toBe(X402_VERSION);
    expect(body.accepts).toHaveLength(1);
    expect(body.error).toBe("Payment required");
  });
});
