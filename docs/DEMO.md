# PROBATION — live demo & on-chain records

## Custom ERC-8183 deployment (BSC testnet, 9s dispute window)

The official BSC testnet ERC-8183 `OptimisticPolicy` has an immutable 900-second
dispute window and the official Router's policy whitelist is owner-only, so a
shorter window cannot be used there. PROBATION therefore runs its demo against a
self-deployed ERC-8183 stack:

| Contract | Address | Note |
|---|---|---|
| Commerce (proxy) | `0x30b60a735e2df8a2909b0cfecfcf338a90bde013` | escrow kernel |
| Commerce (impl) | `0x26ad86f3ceec06ba70dd0eb97c89dfd5d8e89805` | UUPS implementation |
| Router (proxy) | `0x251b90f07d270d3a435eac6bb7a4b0f7cab76124` | evaluator + hook |
| Router (impl) | `0x6fcdc207f603e6b4c4f2dfc8514421d8d7694d33` | UUPS implementation |
| OptimisticPolicy | `0x45e04b6be81cce7208bf5518ca64f47b82c1057d` | `disputeWindow = 9s`, quorum 1 |

- Payment token: **United Stables `$U`** `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565`
- Agent / provider wallet: `0xB675d67909185f5E983EC51b2AED14667eA31b33`
- SDK override env vars: `ERC8183_COMMERCE_ADDRESS`, `ERC8183_ROUTER_ADDRESS`,
  `ERC8183_POLICY_ADDRESS` (see `.env.example`).

## On-chain records

| Job | Stack | Escrow | Result | Evidence submit tx |
|---|---|---|---|---|
| 1195 | official | 0 U (free) | SUBMITTED | `0xe7b13f5bd8cfffb26c1f7dca2ded1499112784e48d472ec259d06fd62181a5e9` |
| 1196 | official | 1 U | SUBMITTED | `0x6756c79928b045b44b1874cd27cb0c35fdb9db9f42f318df923d0cffb4d5bea9` (block 130039996) |
| 1 | custom | 1 U | COMPLETED | `0x2498029545457e71aa9b270dbb537e7caafa605334518454f1e24584f8f35872` |
| 2 | custom | 1 U | COMPLETED | via `pnpm demo` (settled) |

## Demo flow

One command runs the full "evidence before trust" loop end-to-end:

```bash
pnpm demo 1   # 1 U: hire → agent evidence → 9s window → settle
```

Or run each step:

```bash
pnpm hire 1                  # buyer: negotiate + create + fund
pnpm settle <jobId>          # buyer: finalise after the 9s window
pnpm security-check 0x…      # read-only authorization scan (Agent Advantage Report)
```

The frontend (`pnpm dev`, then `/`) exposes the same flow as a one-click live
trial with a health-factor evidence card. See `docs/screenshots/`.
