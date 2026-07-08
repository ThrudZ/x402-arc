# Design system

## Strategy
Restrained-committed. Tinted-neutral canvas, one saturated accent that carries
the hero and the live protocol animation. The animation IS the imagery: the page
renders the actual x402 handshake (GET -> 402 -> sign -> X-PAYMENT -> 200 + tx)
rather than stock photos, because the product is a protocol.

## Type
- Family: Plus Jakarta Sans (committed identity). Weights 500/600/700/800.
- Display: 800, tracking -0.03em, `text-wrap: balance`, clamp max ~5rem.
- Mono: ui-monospace stack, used ONLY for protocol literals (status codes,
  headers, hashes, voucher fields). Honest here: this is HTTP developer infra.

## Color (OKLCH)
- canvas light `oklch(0.97 0.012 245)` / dark `oklch(0.24 0.012 250)`
- ink light `oklch(0.22 0.02 250)` / dark `oklch(0.94 0.01 245)`
- accent `oklch(0.62 0.14 245)`, accent-strong `oklch(0.5 0.16 250)`
- Contrast: body ink >= 4.5:1 on canvas. Muted text stays >= 4.5:1.

## Motion
- One orchestrated first-load: hero headline + status pill stagger.
- Centerpiece: an auto-playing, looping protocol sequence (staggered rows,
  ease-out-expo). Pauses/crossfades under `prefers-reduced-motion`.
- Micro: `btn-anim` press, accent underline sweeps. No bounce, no elastic.

## Bans respected
No side-stripe borders, no gradient text, no glass default, no hero-metric
template, no per-section uppercase eyebrows, no numbered section scaffolding.
