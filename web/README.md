# web

Next.js app for the x402 escrow gateway: a landing surface plus a live panel
that runs the real 402 handshake against the deployed contract on Arc.

## Run

```bash
cp .env.local.example .env.local   # fill the Arc params + gateway address
pnpm --filter web dev
```

## Env

Public (client) and server values both live in `.env.local`:

- `NEXT_PUBLIC_ARC_CHAIN_ID`, `NEXT_PUBLIC_ARC_RPC_URL`,
  `NEXT_PUBLIC_ARC_USDC_ADDRESS`, `NEXT_PUBLIC_ARC_GATEWAY_ADDRESS`
- `SELLER_ADDRESS`, `FACILITATOR_URL` for the paid API route

The protected route is `app/api/premium/route.ts`, gated with `withPayment`.
The wallet flow uses wagmi + RainbowKit; the animated protocol view is
`components/ProtocolFlow.tsx`.
