# Contributing

Thanks for your interest in the x402 escrow gateway.

## Layout

- `contracts/` Foundry project (Solidity 0.8.30, OpenZeppelin).
- `packages/x402-arc/` the SDK (402 middleware, voucher client).
- `packages/facilitator/` the verify + settle service.
- `web/` the Next.js app.

## Before opening a PR

- Contracts: `cd contracts && forge test` must pass.
- SDK: `pnpm --filter x402-arc build` must pass with no type errors.
- Keep commits small and focused, with plain English messages.
- No secrets in the tree. Network params and keys live in gitignored `.env`
  files, never committed.

## Reporting issues

Use the issue templates. Include the network, addresses, and a reproduction
where possible.
