# PROBATION Product Requirements Document (PRD)

## 1. Background & problem

Facing a pile of finance agents, a user sees marketing, ratings, and return screenshots — not which one actually fits their task. To verify capability, they're often asked to deposit, authorize, or hand over sensitive data first. That creates a contradiction:

> **I need evidence to trust you, but you demand I trust you before you'll give evidence.**

It is compounded by three things: reputation and rankings can be gamed; past performance doesn't predict the user's specific task; and an agent's "proven advantage" is usually asserted rather than measured.

PROBATION solves this by reversing the order: **evidence before trust, authority follows the user's decision.** The user buys a bounded trial, sees verifiable results, and only then decides whether to grant broader authority.

## 2. Goals & users

- **Target user**: retail DeFi users on BSC who want AI agents to manage LP / grid / yield / lending positions, but can't tell which agent really works and is really worth paying.
- **Core outcome**: the user pays a clear fee, grants limited authority, receives a **result worth buying**, and keeps the choice to continue or leave.
- **Not**: a review site, a rating platform, a return-screenshot gallery.

## 3. Core mechanism: a trial is a contract, not a chat

Every trial is fixed up front by a unified `Trial Spec` (see §5). Three sums of money must be separated:

1. **Service fee** — paid to the seller agent / platform.
2. **Execution principal** — the user's assets a task may move.
3. **Network & call costs** — gas, API calls, etc.

Buying a service does **not** automatically grant the seller permission to move user funds.

## 4. Four-category coverage (main-track bar)

| Category | Trial task | Evidence the user should get | Must not claim |
|---|---|---|---|
| Rebalancing | Inspect a position, propose adjustments per agreed conditions, execute approved actions | Input state, calculation basis, transactions, post-adjustment position, cost | One good rebalance = long-term outperformance |
| Grid Trading | Create, track, stop a set of orders within explicit budget and parameters | Order states, fill/cancel records, capital usage, fees | Placing orders = fills, or grids always profit |
| Yield Optimisation | Compare a bounded set of yield sources, execute a bounded migration when conditions hold | Data timestamps, fees, limits, migration result or reason not to migrate | Nominal APR = realized user return |
| Health Factor Monitoring | Monitor a lending position and fire alerts or approved responses per agreement | Observation timestamps, calculation basis, trigger records, response results | Monitoring = no liquidation |

"Insufficient data, no decision" and "conditions not met, no action" can be valid deliverables, but they must carry evidence — not become a universal excuse for doing nothing.

## 5. Trial Spec (data contract)

Unified fields (names negotiable, meaning non-negotiable):

```text
taskId
agentId / provider
category
taskDescription
inputReferences
network / protocol
agentVersion / configuration
serviceFee
executionBudget
allowedActions
expiry
acceptanceCriteria
requiredEvidence
dataFreshnessRequirements
failureAndRefundPolicy
```

A trial record is bound to **agent version, configuration, task scope, and time**. After an agent updates, old-version results must not be carried forward unconditionally.

## 6. Staged authorization

- **Observe stage**: only the minimum data needed for the task; no DeFi execution rights. Service fee is separated from asset-operation authority.
- **Limited-execution stage**: a bounded task runs only after the user explicitly agrees to scope / amount / duration / target (per-transaction signature, or a verified limited session).
- **Ongoing stage**: the user reviews evidence, then actively confirms a new contract and new authority. An old trial must not be read as permanent authorization.

Implementation: **Altana EIP-7702 session keys** (call allowlist / spend cap / expiry / onchain Keystore registration / one-click revocation). Three caveats: a spend cap is not a loss cap; revoking future authority does not undo completed transactions; stopping an agent does not auto-close or cancel all orders.

## 7. Core screens (5)

| Screen | What the user accomplishes |
|---|---|
| Task marketplace | Find real, usable agents by task and category |
| Service detail & compare | Understand price, capability, limits, permissions, history, trial scope |
| Trial order | Confirm inputs, fee, execution budget, acceptance criteria, authorization |
| Task workbench | Track progress, cost, anomalies, pending approvals |
| Evidence & next steps | Inspect the deliverable, end/continue, view & revoke permissions |

Three-state provenance labels: **provider claim / platform live test / third-party history**. Show missing states when there's no reliable data; never fabricate returns, customer counts, or win rates.

## 8. Judging requirements

**Main track** (Functionality / Data Quality / Agent Diversity): all four categories at equal depth; a stranger completes "discover → compare → hire → see result" with zero instructions.

**TermiX**: `Agent Advantage Report` — ≥3 real tasks both ways (time / cost / quality + actual outputs), at least one from trading/stock/security. The **security task is a wallet-authorization check** (read-only + revocation, zero real-fund risk, real onchain evidence) — the compliant, low-risk required entry.

**Altana**: self-custodial agent + real-limit session + onchain Keystore registration + user-revocable. Show live onchain transactions during judging.

## 9. Scope

**In scope (v1)**: four-category discovery layer + one real hire loop + honest evidence + Agent Advantage Report + staged authorization (Altana sessions).

**Out of scope (v1)**: custom contracts, platform token, ZK, reputation tokens, multi-chain, automatic dispute platforms, x402 alongside ERC-8183, complex ranking / auto-recommendation, animation.

## 10. Success metric

Can a stranger — through PROBATION — pay a clear fee, grant limited authority, receive a result worth buying, and keep the choice to continue or leave?
