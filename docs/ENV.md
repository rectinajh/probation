# PROBATION — environment variables, and how to obtain each

These are **server-side** secrets. None of them go in the browser. The buyer user connects their own wallet in the UI (via wagmi); the SDK wallet and 8004scan key stay on the backend.

Copy `.env.example` to `.env` and fill each field below.

## `NETWORK`

- **What**: `bsc-testnet` (default) or `bsc-mainnet`.
- **How to get**: just choose. Use `bsc-testnet` for the demo. BSC testnet chain id `97`, symbol `tBNB`.
- **Where used**: SDK network resolution for `EVMWalletProvider`, `ERC8183Client`, `ERC8183JobOps`.

## `WALLET_PASSWORD`

- **What**: the password that encrypts the local **Keystore V3** wallet file used by `EVMWalletProvider`.
- **How to get**: you invent it. Use a long, unique password.
- **Security**: keep it secret, don't commit it. If you lose it, the encrypted agent wallet (`~/.bnbagent/wallets/<address>.json`) is unrecoverable.

## `PRIVATE_KEY`

- **What**: the private key of the **agent / seller wallet**. This wallet registers an ERC-8004 identity and receives ERC-8183 escrow payments. It is different from the buyer user's wallet.
- **How to get**:
  1. Create a fresh testnet wallet (MetaMask / Rabby, or any wallet generator).
  2. Fund it with test BNB from the official faucet: <https://www.bnbchain.org/en/testnet-faucet> (0.3 tBNB, 24h cooldown; or <https://testnet.bnbchain.org/faucet-smart>).
  3. Paste its private key into `PRIVATE_KEY`.
- **First run only**: the SDK imports it, encrypts it to `~/.bnbagent/wallets/<address>.json` under `WALLET_PASSWORD`, then you can remove the `PRIVATE_KEY` line and keep only `WALLET_PASSWORD` for later runs.
- **Security**: never commit; never put in the frontend/logs; use a testnet-only wallet. There is more in the SDK security docs (<https://docs.bnbchain.org/developer-kit/bnbagent-sdk/security/>).

## Payment token — United Stables `$U` (escrow)

- **What**: ERC-8183 escrow is denominated in a stablecoin, not tBNB. On
  `bsc-testnet` the payment token is **United Stables (`U`)**, 18 decimals,
  `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565`.
- **How to get**: the official BNB Chain testnet faucet also dispenses `$U`
  (10 U per claim). Fund the **same wallet** as `PRIVATE_KEY`:
  <https://www.bnbchain.org/en/testnet-faucet>
- **Why**: a job with a real budget needs the wallet to hold `U`. tBNB only
  covers gas. A zero-budget job (`pnpm hire 0`) needs no `U` and exercises the
  full pipeline for free.

## `ERC8183_AGENT_URL`

- **What**: the public base URL of your seller-runner; the SDK's deliverable-URL fallback host used by `ERC8183JobOps`.
- **How to get**:
  - During local dev: run the seller-runner and expose it with a tunnel (ngrok / cloudflared) to get a public URL.
  - For judging: deploy the seller-runner (or your orchestrator) to a persistent host (a small Node process on Fly / Render / Vercel, or your Next.js API route) and use that public URL.
- **Where used**: `ERC8183JobOps.create({ ... agentUrl: process.env.ERC8183_AGENT_URL })`.

## `PROVIDER_ADDRESS`

- **What**: the address of the agent you are **hiring** — the seller/agent wallet, registered via ERC-8004.
- **How to get**:
  - **Self-hire demo**: it's your own registered agent address, from `ERC8004Agent.registerAgent(...)` → the agent identity (resolves to the agent's wallet). Use the same wallet as `PRIVATE_KEY`.
  - **Hire a third-party agent**: find it via the 8004scan discovery API (the agent's `provider` / wallet address field).
- **Where used**: `ERC8183Client.createJob({ provider: process.env.PROVIDER_ADDRESS, ... })`.

## `SCAN_8004_API_KEY`

- **What**: your 8004scan developer API key (ERC-8004 discovery / reputation data).
- **How to get**:
  1. Go to the 8004scan Developer Hub: <https://8004scan.io/developers>.
  2. Create an API key.
  3. **Hackathon participants**: submit the **Pro-Tier Upgrade Form** (linked on that page) to get free Pro-tier for the hackathon — 500 req/min and 100,000 req/day. Without the upgrade the anonymous tier is ~10 req/min, which is too slow for a live marketplace page.
- **Security**: backend only. **Do not** use a `NEXT_PUBLIC_` prefix or import it in any client component.
- **Note**: the variable is named `SCAN_8004_API_KEY` (not starting with a digit) so it's a valid shell env var.

## Quick checklist before running

```bash
cp .env.example .env
# fill NETWORK, WALLET_PASSWORD, PRIVATE_KEY (first run), ERC8183_AGENT_URL,
# PROVIDER_ADDRESS, SCAN_8004_API_KEY
pnpm dev          # frontend
pnpm seller-runner  # seller side (polling + submit deliverable)
```

See the BNB Agent SDK TypeScript quickstart for the authoritative API surface: <https://docs.bnbchain.org/developer-kit/bnbagent-sdk/quickstart-typescript/>.
