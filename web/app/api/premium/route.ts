import { withPayment } from "x402-arc";
import { facilitator, SELLER_ADDRESS, x402Config } from "@/lib/x402";

const RESOURCE = "GET /api/premium";

/** The actual paid handler. Runs only after a valid escrow voucher settles. */
async function handler(): Promise<Response> {
  return Response.json({
    data: "This response cost 0.01 USDC, settled on Arc via escrow.",
    generatedAt: new Date().toISOString(),
  });
}

let gated: ReturnType<typeof withPayment> | null = null;

/** Built lazily so `next build` doesn't require Arc env at compile time. */
function gate() {
  if (!gated) {
    gated = withPayment(handler, {
      resource: RESOURCE,
      price: {
        amount: "10000", // 0.01 USDC (6 decimals)
        payTo: SELLER_ADDRESS(),
        description: "Premium API call",
      },
      config: x402Config(),
      facilitator: facilitator(),
    });
  }
  return gated;
}

export function GET(req: Request) {
  return gate()(req);
}
