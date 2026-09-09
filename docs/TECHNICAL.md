# PROBATION Technical Design

## 1. Stack

- Frontend: Next.js (App Router) / React / TypeScript; wallet via wagmi + viem
- Onchain: `@bnbagent/sdk` (Node ≥ 20; subpaths `./erc8004` `./erc8183` `./x402` `./storage` `./wallets` `./signing`)
- Discovery: 8004scan API (ERC-8004, 200k+ registered agents, free Pro-tier 500 req/min during the hackathon)
- Authorization: Altana `AltanaWalletProvider` (EIP-7702 session keys)
- Network: BSC testnet (MegaFuel gas sponsorship), mainnet per judging requirements
- Backend/orchestration: Next.js API routes or a lightweight Node service

## 2. System architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Next.js / React frontend                 │
│  marketplace · detail/compare · trial order · workbench ·   │
│  evidence                                                     │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTP
┌──────────────▼──────────────────────────────────────────────┐
│               Marketplace backend & orchestration (API)      │
│  agent discovery/verify · quote/hire · job lifecycle ·       │
│  permissions/wallet · service adapters · evidence capture ·  │
│  experiment log                                               │
└───┬──────────┬────────────┬───────────────┬─────────────────┘
    │          │            │               │
    ▼          ▼            ▼               ▼
 8004scan   ERC-8183     Altana         seller agents
 (discovery) (hire/escrow) (session auth) (BNB Agent Studio / Altana skills)
```

## 3. Four roles, fund flow & keys

| Role | Holds | Can do |
|---|---|---|
| Buyer user | Own wallet private key (local/self-custodial wallet) | Create trial, grant session, approve/reject delivery, revoke |
| Marketplace operator | Platform backend (API keys, no user private keys) | Orchestrate jobs, show evidence, collect platform fee (if any) |
| Seller agent | **Self-custodial wallet + own key (Altana)** | Execute within session limits |
| Execution wallet | The seller agent's wallet | Actual onchain actions (bounded by session) |

**Custody decision (one-way door, decided)**: the execution wallet is **Altana self-custodial** — the agent holds its own key, the user grants a session with limits/expiry/allowlist, and grant & revoke stay with the user. Not operator custody; avoids rework on the "sovereign agent" narrative.

Fund flow: service fee via ERC-8183 escrow (`createJob → fund → settle`); execution principal supplied by the user wallet within limits; gas/call costs recorded separately.

## 4. Integration matrix (investigate before integrating)

| Category | Candidate source | Network | Call/payment | Deliverable | Permission | Verified |
|---|---|---|---|---|---|---|
| Rebalancing | Altana `PancakeSwap Liquidity` skill / BNB Agent Studio | BSC | ERC-8183 + session | Rebalance txs + before/after state | Limited execution | TBD |
| Grid Trading | Official grid skill / minimal self-built seller | BSC | ERC-8183 | Order-set lifecycle | Limited execution | TBD |
| Yield Optimisation | Altana `Aave V3 / Venus / Lista` skills | BSC | ERC-8183 | Migration or reason-not-to + basis | Limited execution | TBD |
| Health Factor Monitoring | Altana `Venus / Aave` lending data | BSC | session (read-only + alerts) | Observation timestamps + trigger records | Observe (read-only) | TBD |
| Security (report task) | Wallet authorization scan + checklist | BSC | read-only + revoke | Missed items + revocation results | Read-only + revoke | TBD |

Discovery pulls real listings from 8004scan; do **not** rebrand one chat service four ways to fake four capabilities.

## 5. Application state machine

```text
Draft → Quoted → User-confirmed → Paid
→ Running → Delivered → Verifying
→ Accepted / Needs-review / Failed / Expired
```

This is an application flow, **not** any SDK's native state; it must map separately to real payment / job / authorization states. ERC-8183 carries its own: `created / funded / submitted / settled / disputed / expired`.

Across process restarts, network timeouts, and duplicate callbacks: **no double charges, no duplicate orders, no lost failure records** (idempotency anchor = ERC-8183 jobId).

## 6. Minimal data model

```text
User(id, walletAddress)
Agent(id, agentId[ERC-8004], provider, category, version, config, source[claim/live/history])
TrialSpec(taskId, agentId, category, description, inputs, network, serviceFee,
          executionBudget, allowedActions, expiry, acceptanceCriteria,
          requiredEvidence, dataFreshness, failureRefundPolicy)
Job(jobId[ERC-8183], trialSpecId, status, escrow, disputeWindow, settledAt)
Session(sessionKey, wallet, allowlist, spendCap, expiry, keystoreRef, revoked)
Evidence(evidenceId, jobId, kind[tx/state/report], artifactRef, timestamp, chainRef)
```

Artifact storage and sensitive-data access are designed separately; API keys / private keys / session keys never enter the frontend, logs, public reports, or the repo.

## 7. Interface boundaries

- 8004scan API key lives in the backend only, never in the browser.
- ERC-8183 client `createJob / registerJob / fund / settle`; `expiredAt` must clear `disputeWindow + safety buffer`, else `createJob` throws.
- x402 vs ERC-8183: pick one; v1 uses ERC-8183.
- A deliverable summary passing verification ≠ content quality passing.

## 8. Errors & idempotency

LLM deliverables must handle four states independently: `malformed / empty / refusal / hallucinated-json`, each retry / degrade / reject with a clear user message instead of a 500.

The five canonical flows are the chaos-test targets: `happy / dispute-reject / stalemate-expire / never-submit / cancel-open`.

## 9. Security

- External agent descriptions and deliverables are **untrusted input** (prompt-injection defense); they can't change system rules or induce extra tool calls.
- Job/trial data is scoped per user (IDOR defense).
- Without real execution, `status` must never be `completed` (the evidence-truth chain is non-negotiable).

## 10. Deploy & availability

Deploy early, stay up through judging (Sep 9-23), keep testnet faucet balance topped up, and don't let the deployment service expire. The public URL is a hard requirement — higher priority than any feature flag or gray release.

