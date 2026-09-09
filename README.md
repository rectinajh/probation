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
```

## Status

**Working end-to-end.** A live self-hire loop is running on BSC testnet: ERC-8004
discovery, a real ERC-8183 escrowed hire (denominated in `$U`), a
provider-signed negotiation quote, an on-chain Venus health-factor read, and
optimistic settlement. The demo runs against a custom ERC-8183 deployment with a
**9-second** dispute window so the full loop is presentable live.

## Live demo

The frontend (`/`) is a one-click product demo:

1. **Run a trial** — escrows 1 U and creates an on-chain ERC-8183 job.
2. The seller agent reads the position's live Venus health factor and submits
   evidence on-chain.
3. After a 9-second optimistic window the job settles and escrow is released.

Terminal equivalent (one command, full loop):

```bash
pnpm demo 1          # 1 U budget: hire → evidence → 9s window → settle
pnpm hire 1          # buyer side only (create + fund)
pnpm settle <jobId>  # finalise after the dispute window
pnpm security-check 0x…   # read-only wallet authorization scan (Agent Advantage Report)
```

## Getting started

```bash
cp .env.example .env   # then fill each value — see docs/ENV.md
pnpm install
pnpm dev               # frontend (live trial)
pnpm seller-runner     # provider side (poll + submit deliverable)
```

## Stack

- Frontend: Next.js (App Router) / React / TypeScript
- Onchain: `@bnbagent/sdk` (ERC-8004 identity / ERC-8183 hire & escrow / signed quotes)
- Discovery: 8004scan API (ERC-8004)
- Authorization: Altana EIP-7702 session keys (staged authority; observe stage ships read-only)
- Network: BSC testnet (demo stack) + mainnet addresses for the security scan
