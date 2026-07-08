import { createServer } from "node:http";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { arcParamsFromEnv } from "x402-arc";
import { createFacilitator } from "./facilitator";

/**
 * Standalone facilitator service. Env:
 *   FACILITATOR_PRIVATE_KEY  redeem-submitting account (holds USDC for gas)
 *   ARC_CHAIN_ID, ARC_RPC_URL, ARC_USDC_ADDRESS, ARC_GATEWAY_ADDRESS
 *   PORT (default 4021)
 */
function main() {
  const pk = process.env.FACILITATOR_PRIVATE_KEY as Hex | undefined;
  if (!pk) throw new Error("FACILITATOR_PRIVATE_KEY is required");

  const facilitator = createFacilitator({
    arc: arcParamsFromEnv(),
    account: privateKeyToAccount(pk),
  });

  const readBody = (req: import("node:http").IncomingMessage): Promise<any> =>
    new Promise((resolve, reject) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on("error", reject);
    });

  const server = createServer(async (req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };

    try {
      if (req.method === "GET" && req.url === "/health") {
        return send(200, { status: "ok" });
      }
      if (req.method !== "POST") return send(405, { error: "method not allowed" });
      const { payload, requirements } = await readBody(req);
      if (!payload || !requirements) return send(400, { error: "missing payload or requirements" });

      if (req.url === "/verify") return send(200, await facilitator.verify(payload, requirements));
      if (req.url === "/settle") return send(200, await facilitator.settle(payload, requirements));
      return send(404, { error: "not found" });
    } catch (err) {
      return send(500, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  const port = Number(process.env.PORT ?? 4021);
  server.listen(port, () => console.log(`facilitator listening on :${port}`));
}

main();
