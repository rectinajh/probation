# PROBATION deployment runbook

Two processes, two hosts. Vercel runs the frontend + API routes (serverless).
The seller-runner is a long-running poll loop and must run on a persistent host
(Fly / Render / Railway), **not** Vercel.

## 1. Environment variables

Every host needs a subset. Values are secrets: set them per-host, never commit.

| Variable | Vercel (frontend + /api/hire) | Seller host |
|---|---|---|
| `NETWORK` | yes | yes |
| `RPC_URL` | yes | yes |
| `WALLET_PASSWORD` | yes | yes |
| `PRIVATE_KEY` | yes (first import) | yes (first import) |
| `PROVIDER_ADDRESS` | yes | no |
| `ERC8183_AGENT_URL` | yes | yes |
| `SCAN_8004_API_KEY` | yes | no |
| `BNBAGENT_FALLBACK_RPC_URLS` | optional | optional |
| `BNBAGENT_USE_PAYMASTER` | optional | optional |

The buyer wallet funds the trial; the seller wallet receives escrow. For a
self-hire demo both are the same wallet. Fund it with test BNB:
<https://www.bnbchain.org/en/testnet-faucet>.

## 2. Vercel (frontend)

```bash
vercel login
vercel --prod --yes

# push the secrets from .env into the Vercel project
vercel env add NETWORK
vercel env add RPC_URL
vercel env add WALLET_PASSWORD
vercel env add PRIVATE_KEY
vercel env add PROVIDER_ADDRESS
vercel env add ERC8183_AGENT_URL
vercel env add SCAN_8004_API_KEY
```

## 3. Seller-runner (Fly.io)

```bash
# one-time
brew install flyctl   # or: curl -L https://fly.io/install.sh | sh
flyctl auth login

# create + deploy the worker (uses Dockerfile)
flyctl launch --name probation-seller --dockerfile Dockerfile --no-deploy
flyctl secrets set NETWORK=bsc-testnet WALLET_PASSWORD=... PRIVATE_KEY=... ERC8183_AGENT_URL=... RPC_URL=...
flyctl deploy
flyctl logs            # watch the poll loop
```

Notes:
- The seller-runner serves no HTTP; it just polls funded jobs and submits
  deliverables. No public port is needed.
- The `LocalStorageProvider("./.agent-data")` is ephemeral on a Fly volume;
  mount a volume or switch to a DB for durable deliverables.

## 4. End-to-end test (testnet)

1. Register an agent (already done: id `2296`, wallet `0xB675...`).
2. Start the seller-runner (container or `pnpm seller-runner`).
3. Hire through the UI or directly:
   ```bash
   curl -X POST http://localhost:3000/api/hire \
     -H 'content-type: application/json' \
     -d '{"provider":"0xB675d67909185f5E983EC51b2AED14667eA31b33","description":"monitor health factor","budget":"0"}'
   ```
4. The seller-runner picks up the funded job, runs the adapter, submits.
5. Check the deliverable:
   ```bash
   curl http://localhost:3000/api/deliverable/<jobId>
   ```

## 5. Verification checklist

- [ ] `/api/hire` returns a jobId without a 500 (env + wallet + RPC working).
- [ ] seller-runner logs the funded job and submits a deliverable.
- [ ] `/api/deliverable/:jobId` returns the evidence (not 404).
- [ ] the live Vercel URL stays up through the judging window.

