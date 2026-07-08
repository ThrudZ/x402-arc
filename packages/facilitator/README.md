# facilitator

Verifies buyer-signed vouchers and settles them on Arc by calling
`redeem(voucher, signature)` on the escrow gateway. Runs as a standalone HTTP
service or is embedded via `createFacilitator`.

## Run

```bash
FACILITATOR_PRIVATE_KEY=0x... \
ARC_CHAIN_ID=5042002 \
ARC_RPC_URL=https://rpc.testnet.arc.network \
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000 \
ARC_GATEWAY_ADDRESS=0x049914870eF36AbC7c92E390937A012bEd1E1ec3 \
pnpm --filter facilitator dev
```

The submitting account (`FACILITATOR_PRIVATE_KEY`) pays gas in USDC on Arc.

## Endpoints

- `GET /health` liveness check.
- `POST /verify` body `{ payload, requirements }`, returns `{ valid, reason? }`.
- `POST /settle` verifies then submits `redeem`, returns `{ success, txHash? }`.

## Embedded use

```ts
import { createFacilitator } from "facilitator";

const facilitator = createFacilitator({ arc, account });
await facilitator.settle(payload, requirements);
```

Verification checks the requirements match, the EIP-712 signature recovers to the
buyer, the escrow balance covers the amount, and the voucher has not been
redeemed. Settlement re-verifies before broadcasting.
