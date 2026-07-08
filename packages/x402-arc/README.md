# x402-arc

SDK for the x402 escrow payment scheme on Arc. It provides the server gate that
returns `402 Payment Required`, the client that signs a voucher and retries, and
the shared types for both sides.

## Install

```bash
pnpm add github:ThrudZ/x402-arc#path:packages/x402-arc
```

## Server: gate a route

```ts
import { withPayment, httpFacilitator } from "x402-arc";

export const GET = withPayment(handler, {
  resource: "GET /api/premium",
  price: { amount: "10000", payTo: SELLER }, // 0.01 USDC (6 decimals)
  config: { network: "arc", chainId, asset: USDC, gateway: GATEWAY },
  facilitator: httpFacilitator("http://localhost:4021"),
});
```

The first request without an `X-PAYMENT` header gets a `402` with the payment
requirements. A request carrying a valid voucher is verified, settled on Arc,
and passed through to `handler`, with the settlement echoed in
`X-PAYMENT-RESPONSE`.

## Client: pay for a request

```ts
import { wrapFetchWithPayment } from "x402-arc";

const paidFetch = wrapFetchWithPayment(fetch, { wallet, account });
const res = await paidFetch("/api/premium"); // signs a voucher on the 402, retries
```

## Key exports

- `withPayment(handler, opts)` server gate for Web `Request` handlers.
- `wrapFetchWithPayment(fetch, signer)` client fetch wrapper.
- `createPayment(args)` sign a single voucher and get the `X-PAYMENT` header.
- `buildRequirements` / `build402Body` construct the 402 response.
- `defineArcChain` / `arcParamsFromEnv` viem chain config for Arc.
- `httpFacilitator(url)` client for a remote facilitator.

USDC on Arc uses 6 decimals in the ERC-20 interface; amounts are strings of base
units (`"10000"` = 0.01 USDC).
