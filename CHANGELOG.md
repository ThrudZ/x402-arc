# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added

- `EscrowPaymentGateway` contract: prefunded escrow with EIP-712 voucher
  redemption, time-locked withdrawals, and an optional protocol fee.
- `x402-arc` SDK: `withPayment` server gate, `wrapFetchWithPayment` client,
  `createPayment`, requirements builders, and Arc chain config.
- Facilitator service: `/verify`, `/settle`, and `/health` endpoints, plus an
  embeddable `createFacilitator`.
- Next.js app wired to a live Arc testnet deployment.
- Foundry and vitest test suites, and CI running both.

### Deployed

- Arc testnet (chain 5042002): `EscrowPaymentGateway` at
  `0x049914870eF36AbC7c92E390937A012bEd1E1ec3`.
