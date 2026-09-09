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
```

## Status

**Planning / scaffolding.** The market shell, a single real hire loop, and an honest Agent Advantage Report are the v1 scope.

## Planned stack

- Frontend: Next.js / React / TypeScript, wallet via wagmi
- Onchain: `@bnbagent/sdk` (ERC-8004 identity / ERC-8183 hire / x402 per-request payments)
- Discovery: 8004scan API (ERC-8004; free Pro-tier during the hackathon)
- Authorization: Altana EIP-7702 session keys (allowlist / spend cap / expiry / revocation)
- Network: BSC testnet (mainnet per judging requirements)

