# x402 Payment Gateway on Arc

## What it is
A pay-per-request payment gateway implementing the x402 (`402 Payment Required`)
flow with an escrow settlement scheme, built for Arc (Circle's L1) where USDC is
the native asset. Developer infrastructure: a buyer deposits USDC once, signs an
EIP-712 voucher per request, and a facilitator redeems it on-chain.

## Who it's for
Backend/protocol engineers monetizing APIs, agents, and machine-to-machine
calls. Builder-first audience. They care about: latency, settlement finality,
one-asset simplicity (no separate gas token), and a clean SDK.

## Register
Brand landing surface (design communicates the product) fused with a live
functional demo. The page must both sell the idea and let a wallet run the real
402 handshake.

## Voice
Restrained, institutional, technically literal. Brex / Mercury / Stripe stance.
No hype, no token/yield/APR language, no superlatives without data. This is
infrastructure, not a financial product.

## Non-negotiables (from the owner's standing system)
- Plus Jakarta Sans, heavy weights (500 body / 700+ headings). Committed identity.
- Light mode default; dark = soft warm slate, opt-in via `html.dark`.
- Accent in the `oklch(0.62 0.14 240)` sky-blue range; body bg `#f0f5fb`-ish.
- No em-dashes, no middots, no emojis, no gradients on text, no glassy blur.
- No fake stats, no fake testimonials, no invented user counts.
