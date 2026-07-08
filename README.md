# x402 Payment Gateway on Arc

Machine-payable APIs need settlement that is instant, cheap, and denominated in
the unit the service actually charges in. On Arc, that unit is USDC, and USDC is
the native asset. That removes the usual friction of an x402 integration: there
is no separate gas token to hold, no wrapping, no bridge. A request costs a few
cents of USDC and settles in one asset.

This gateway implements the [x402](https://www.x402.org) `402 Payment Required`
flow with an **escrow** settlement scheme built for pay-per-request workloads:

- A buyer deposits USDC into an escrow contract once.
- Each request is authorized by an off-chain EIP-712 voucher the buyer signs.
- A facilitator redeems the voucher on Arc, moving funds to the seller.

Escrow (rather than a per-request on-chain transfer) fits high-frequency API
consumption: signing a voucher is free and instant, and only redemption touches
the chain. It also gives the buyer a refund path (a time-locked withdrawal of
unused balance) and the operator a place to apply protocol fees or disputes.

## How a paid request works

1. Client calls a protected route. Server returns `402` with `accepts`
   (amount, seller `payTo`, USDC asset, gateway address, resource id).
2. Client signs a voucher and retries with an `X-PAYMENT` header.
3. Facilitator verifies the signature, checks escrow balance and that the
   voucher is unused, then submits `redeem(voucher, sig)` on Arc.
4. Server returns the paid response with `X-PAYMENT-RESPONSE` (tx hash).

## Layout

```
contracts/          Foundry: EscrowPaymentGateway.sol + tests + deploy script
packages/x402-arc/  SDK: 402 middleware, voucher client, requirements, types
packages/facilitator/  verify + settle service (viem, Arc RPC)
web/                Next.js demo: paid API route + wallet paywall
```

## Running it

Contracts (needs [Foundry](https://book.getfoundry.sh/getting-started/installation)):

```bash
cd contracts
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts
forge test
forge script script/Deploy.s.sol --rpc-url $ARC_RPC_URL --broadcast
```

Everything else (needs pnpm):

```bash
pnpm install
pnpm --filter x402-arc build
cp .env.example .env && cp web/.env.local.example web/.env.local   # fill Arc params
pnpm facilitator      # starts the facilitator on :4021
pnpm web              # starts the demo on :3000
```

Arc chain id, RPC URL and the canonical USDC address are network parameters and
are intentionally not hardcoded. Fill them from the Arc network docs before
running.

## Live deployment

The escrow gateway is deployed and settling real payments on Arc testnet
(chain `5042002`). Full record in [deployments/arc-testnet.json](deployments/arc-testnet.json).

| | |
|---|---|
| EscrowPaymentGateway | `0x049914870eF36AbC7c92E390937A012bEd1E1ec3` |
| USDC (ERC-20, 6 decimals) | `0x3600000000000000000000000000000000000000` |
| RPC | `https://rpc.testnet.arc.network` |

To run the real 402 handshake against it (deposit, sign a voucher, settle
on-chain, claim), point `PRIVATE_KEY` at a USDC-funded account and run:

```bash
pnpm --filter x402-arc build
node --import tsx packages/facilitator/scripts/e2e.ts
```
