# PROBATION — Evidence Before Trust

> A BNB Chain agent marketplace where users hire agents for bounded, real-world trials, inspect verifiable results, and explicitly choose whether to grant broader authority.

Built for the BNB Chain "The Smart Money Era: Build the Era" hackathon (2026-08-05 ~ 09-09, UTC+0).

## Background

The AI-agent economy on BNB Smart Chain is growing fast. More than 200,000 ERC-8004 agents are already registered on 8004scan, and BNB Chain wants a single marketplace that becomes the canonical front door for every agent on BSC. But a marketplace is only useful if a user can find the right agent, understand what it actually does, and trust that hiring it is worth paying for.

## How the problem arises

A user facing a pile of finance agents usually sees marketing, ratings, and return screenshots — not which one actually fits their task. And to verify capability, they're asked to deposit, authorize, or hand over sensitive data first. That creates a contradiction:

> I need evidence to trust you, but you demand I trust you before you'll give evidence.

It's compounded by three things: reputation and rankings can be gamed; past performance doesn't predict your specific task; and "proven advantage" is usually asserted rather than measured.

## The problem it solves

There's no trustworthy way to judge whether a DeFi agent is worth paying for before committing funds or authority. Concretely:

- Users can't tell which agent fits their specific task.
- Verification requires risky up-front trust — deposit, authorization, or sensitive data.
- Rankings tell you what's popular, not what works for your job.
- An agent's claimed advantage is rarely backed by evidence.

## How it solves it

PROBATION inverts the order: **evidence before trust, authority follows the user's decision.**

```text
User states a task and limits
→ discover and compare real agents
→ see service fee, execution budget, permissions, acceptance criteria
→ buy one bounded trial
→ agent does real work
→ system verifies the deliverable and shows full evidence
→ user decides: stop / continue / re-authorize
```

The mechanisms that keep this honest:

- **A trial is a contract, not a chat.** Every trial is fixed up front in a `Trial Spec` — fee, budget, allowed actions, acceptance criteria, required evidence, and failure/refund policy.
- **Staged authorization.** Observe (read-only) → limited-execute (with user-approved scope, amount, duration) → ongoing (user re-confirms). Authority never silently expands. Implemented with Altana EIP-7702 session keys (allowlist / spend cap / expiry / revoke).
- **Three-state provenance.** Provider claim vs platform live-test vs third-party history are labeled differently; missing data shows as missing, never fabricated.
- **Evidence bound to reality.** Trial records bind agent version, config, task scope, and time; no real transaction means status is never "completed."

Honest limits we state plainly: passing a trial isn't permanent authority; a spend cap isn't a loss cap; monitoring isn't a no-liquidation guarantee; stopping an agent doesn't auto-close positions.

## Hackathon context

- **Main track** — four categories at equal depth: Rebalancing / Grid Trading / Yield Optimisation / Health Factor Monitoring.
- **TermiX track** — judged on "does hiring an agent beat doing it yourself," requiring an Agent Advantage Report (≥3 real tasks both ways, at least one from trading/stock/security).
- **Altana track** — self-custodial agents with real-limit onchain sessions (allowlist, spend cap, expiry, revoke).

## Repo layout

```text
README.md           project overview (this file)
docs/
  PRD.md            product requirements document
  TECHNICAL.md      technical design
  ENV.md            how to obtain each environment variable
  DEPLOY.md         deployment runbook (Vercel + seller host)
  AGENT-ADVANTAGE-REPORT.md   TermiX evidence report template
  screenshots/      rendered product screenshots
```

## Status

**Working end-to-end across all four categories.** On BSC testnet: real ERC-8004
discovery (from 8004scan), a real ERC-8183 escrowed hire (denominated in `$U`),
a provider-signed negotiation quote, a live read of the chosen capability
(health factor / rebalancing / grid plan / yield APY), and optimistic settlement.
The demo runs against a custom ERC-8183 deployment with a **9-second** dispute
window so the full loop is presentable live.

## Live demo

The frontend (`/`) is a **marketplace + one-click trial**:

1. **Discover** — pick a category tab (Health Factor / Rebalancing / Grid
   Trading / Yield Optimisation). Real ERC-8004 agents are pulled live from
   8004scan, with owner, verified badge, score, feedback and protocols.
2. **Compare** — open a card to see full provenance, then run a bounded trial.
3. **Run a trial** — connect a wallet, sign, escrow 1 U, and the seller reads the
   live on-chain data for that category and submits evidence on-chain.
4. **Verify & decide** — after a 9-second optimistic window the job settles and
   escrow releases; you see the deterministic report and decide whether to stop,
   re-run, or (in a future limited-execute stage) grant bounded authority.

![PROBATION landing](docs/screenshots/home-top.png)

![PROBATION full page](docs/screenshots/home-full.png)

![PROBATION trial complete](docs/screenshots/trial-complete.png)

Terminal equivalent (one command, full loop):

```bash
pnpm demo 1          # 1 U budget: hire → evidence → 9s window → settle
pnpm hire 1          # buyer side only (create + fund)
pnpm settle <jobId>  # finalise after the dispute window
pnpm security-check 0x…   # read-only wallet authorization scan (Agent Advantage Report)
```

The **Agent Advantage Report** (`docs/AGENT-ADVANTAGE-REPORT.md`) is filled with
real, measured runs for all three TermiX experiments (rebalancing, yield
comparison, wallet-authorization security check) — each with the verbatim
terminal output attached and the manual baseline for comparison.

## Custom ERC-8183 deployment (BSC testnet, 9s window)

The official BSC testnet ERC-8183 `OptimisticPolicy` has an immutable 900-second
dispute window and the official Router's policy whitelist is owner-only, so a
shorter window cannot be used there. The demo therefore runs against a
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
| 2 | custom | 1 U | COMPLETED | `0x4d7eca43bd737e0919eccdb37d674177e3c6941da1c37312a5ded7d293fbe88d` |

On the same custom stack, category trials run end-to-end as well — e.g. a
yield-optimisation trial that enumerated all Venus markets, ranked live supply
APY (TRX at ~35.9% top), and settled in the 9s window. Read the submit/settle
transactions directly off-chain via the SDK or a testnet explorer rather than
trusting a copied hash.

## Getting started

```bash
cp .env.example .env   # then fill each value — see docs/ENV.md
pnpm install
pnpm dev               # frontend (live trial)
pnpm seller-runner     # provider side (poll + submit deliverable)
```

## Stack

- Frontend: Next.js (App Router) / React / TypeScript; injected wallet (`window.ethereum`)
- Onchain: `@bnbagent/sdk` (ERC-8004 identity / ERC-8183 hire & escrow / signed quotes)
- Discovery: 8004scan API (ERC-8004)
- Authorization: staged authority — observe stage grants a session with empty allowlist + 0 U spend cap (no asset-moving authority). The Altana EIP-7702 limited-execute session-key path (on-chain Keystore registration + one-click revoke) is designed and documented, not yet deployed on-chain.
- Network: BSC testnet (demo stack) + mainnet addresses for the security scan
