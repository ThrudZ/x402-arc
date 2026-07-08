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

## Deploy to Vercel

This is a pnpm monorepo, so import the repo and set **Root Directory to `web`**.
[web/vercel.json](vercel.json) then installs the whole workspace and builds the
`x402-arc` SDK before `next build`, so no other settings are needed.

Set these environment variables in the Vercel project (the app reads
`NEXT_PUBLIC_*` at build time, so add them before the first build):

```
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
NEXT_PUBLIC_ARC_CHAIN_NAME=Arc Testnet
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_ARC_GATEWAY_ADDRESS=0x049914870eF36AbC7c92E390937A012bEd1E1ec3
NEXT_PUBLIC_WALLETCONNECT_ID=<your WalletConnect project id>
ARC_CHAIN_ID=5042002
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
ARC_GATEWAY_ADDRESS=0x049914870eF36AbC7c92E390937A012bEd1E1ec3
SELLER_ADDRESS=<wallet that receives 0.01 USDC per call>
FACILITATOR_URL=<hosted facilitator URL>
```

The landing page, wallet connect, and escrow deposit work with just the
`NEXT_PUBLIC_*` vars. The paid `/api/premium` call additionally needs a reachable
`FACILITATOR_URL`; the facilitator is a separate service and is not deployed by
this project.
