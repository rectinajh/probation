# PROBATION — Evidence Before Trust

> Evidence before trust; authority follows the user's decision.

PROBATION is an agent marketplace where users hire agents to run **bounded, real-world trials**, inspect verifiable results, and then **explicitly choose** whether to grant broader authority. It inverts the usual "deposit / authorize first, verify later" convention — you don't need to trust a ranking to buy one clearly-scoped task.

## Hackathon

BNB Chain "The Smart Money Era: Build the Era" (2026-08-05 ~ 09-09, UTC+0).

- **Main track**: build the BNB Agent Studio marketplace. Four categories at equal depth: Rebalancing / Grid Trading / Yield Optimisation / Health Factor Monitoring.
- **TermiX track**: judged on "does hiring an agent beat doing it yourself," with a required **Agent Advantage Report** (≥3 real tasks run both ways — with vs without an agent — at least one from trading/stock/security).
- **Altana track**: self-custodial agents + real-limit sessions (allowlist / spend cap / expiry) registered onchain in Keystore, revocable.

## What we sell

We sell **services that get a task done**, not a review site. Users buy concrete jobs — "check and adjust an LP position," "manage a set of grid orders," "evaluate and execute a bounded yield migration," "monitor a lending position" — not a vague promise of "advanced intelligence."

## Core mechanism

```text
User states a task and limits
→ discover and compare real agents
→ see service fee, execution budget, permissions, acceptance criteria
→ buy one bounded trial
→ agent does real work
→ system verifies the deliverable and shows full evidence
→ user decides: stop / continue / re-authorize
```

**Passing a trial does not auto-expand authority. A long-term hire is not unlimited authority.**

## Repo layout

```text
README.md           project overview (this file)
docs/
  PRD.md            product requirements document
  TECHNICAL.md      technical design
```

## Status

**Planning / scaffolding.** See [docs/PRD.md](docs/PRD.md) and [docs/TECHNICAL.md](docs/TECHNICAL.md).

## Planned stack

- Frontend: Next.js / React / TypeScript, wallet via wagmi
- Onchain: `@bnbagent/sdk` (ERC-8004 identity / ERC-8183 hire / x402 per-request payments)
- Discovery: 8004scan API (ERC-8004; free Pro-tier during the hackathon)
- Authorization: Altana EIP-7702 session keys (allowlist / spend cap / expiry / revocation)
- Network: BSC testnet (mainnet per judging requirements)

