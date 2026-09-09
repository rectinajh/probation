# PROBATION Technical Design

## 1. Stack

- Frontend: Next.js (App Router) / React / TypeScript; wallet via injected
  `window.ethereum` (MetaMask / Rabby) through `src/lib/wallet.ts` + viem. We do
  **not** use `wagmi/connectors` (it bundles Coinbase CDP and fails on a missing
  `@x402/evm` dependency) — plain EIP-1193 keeps the bundle small and reliable.
- Onchain: `@bnbagent/sdk` (Node ≥ 20; subpaths `./erc8004` `./erc8183` `./x402` `./storage` `./wallets` `./signing`)
- Discovery: 8004scan API (ERC-8004, 200k+ registered agents, free Pro-tier 500 req/min during the hackathon)
- Authorization: staged authority. The **observe** stage ships read-only and
  grants the agent a session with an **empty allowlist and a 0 U spend cap**, so
  it holds no asset-moving authority. The limited-execute stage (a bounded
  Altana EIP-7702 session key with on-chain Keystore registration + one-click
  revoke) is **designed, documented, not yet deployed on-chain** — see §15.
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
| Rebalancing | Venus balances + oracle (live BNB price) | BSC testnet | ERC-8183 (observe) | Current vs target weight + exact move | Observe (read-only) | **shipped** |
| Grid Trading | Venus oracle price + user stable capital | BSC testnet | ERC-8183 (observe) | Bounded grid plan (range/levels/spacing/cap) | Observe (read-only) | **shipped** |
| Yield Optimisation | Venus `getAllMarkets` supply APY | BSC testnet | ERC-8183 (observe) | Full-market APY ranking + exposure | Observe (read-only) | **shipped** |
| Health Factor Monitoring | Venus `getAccountLiquidity` | BSC testnet | ERC-8183 (observe) | Liquidity/shortfall/status | Observe (read-only) | **shipped** |
| Security (report task) | Wallet authorization scan + checklist | BSC mainnet | read-only + revoke | Missed items + revocation result | Read-only + revoke | **shipped** |

All four observe-stage adapters share one `ServiceAdapter` shell and read real
on-chain data deterministically (`venus.ts` harness). They never move funds.
Limited-execute (actual rebalance/grid/yield-migration transactions) is the next
stage and requires a user-signed bounded session — designed, not yet on-chain.

Discovery pulls real listings from 8004scan; each category is a genuinely
different read-backed capability, **not** one chat service rebranded four ways.

## 5. Application state machine

```text
Draft → Quoted → User-confirmed → Paid
→ Running → Delivered → Verifying
→ Accepted / Needs-review / Failed / Expired
```

This is an application flow, **not** any SDK's native state; it must map separately to real payment / job / authorization states. ERC-8183 carries its own: `created / funded / submitted / settled / disputed / expired`.

Across process restarts, network timeouts, and duplicate callbacks: **no double charges, no duplicate orders, no lost failure records** (idempotency anchor = ERC-8183 jobId).

Three-way state mapping (application ↔ ERC-8183 ↔ Altana session) — required so the UI never claims "running" while the chain says otherwise:

| Application state | ERC-8183 job state | Altana session | User sees |
|---|---|---|---|
| Draft | — | — | "Draft trial" |
| Quoted | — | — | "Quoted: fee X, budget Y" |
| User-confirmed | — | granted (limited) | "Authorized, awaiting payment" |
| Paid | `created` + `funded` | active | "Escrow funded" |
| Running | `funded` | active | "Agent working" |
| Delivered | `submitted` | active | "Deliverable ready for review" |
| Verifying | `submitted` (dispute window) | active | "Reviewing evidence" |
| Accepted | `settled` | keep or revoke | "Complete — decide next step" |
| Needs-review | `disputed` / `rejected` | active | "Dispute raised" |
| Failed | `expired` / never-submit | revoke | "Failed / expired" |
| Expired | `expired` | revoked | "Expired" |

Evidence guard (E2): the `Delivered → Verifying → Accepted` transition requires `evidence.chainRef` to be present and resolvable onchain; otherwise the transition throws. No real transaction = no `completed`.

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

## 11. Seller runner (E1)

The ERC-8183 TypeScript SDK is transport-agnostic: the seller side is a headless polling loop, not an HTTP server. A minimal `seller-runner` must:

- poll `fundedJobWatcher` for funded jobs,
- invoke the seller skill/agent to do the actual work,
- call `submitResult` with idempotent retry on transient failures,
- log the full job lifecycle.

**Decision**: embedded in the orchestrator with simple retry — sufficient for the hackathon; promote to a standalone process only if a category outgrows it.

## 12. ServiceAdapter interface (E3)

One shared shell, four divergent-free implementations:

```ts
interface ServiceAdapter {
  quote(inputs: TrialSpec): Promise<Quote>;
  run(job: Job, session: Session): Promise<RunResult>;
  submitEvidence(job: Job, result: RunResult): Promise<Evidence>;
  cancel(job: Job, session: Session): Promise<void>;
}
```

Each of the four categories implements this interface; the discovery / quote / hire / evidence UI stays shared. DRY comes from the interface, not from copied code.

## 13. Testing (E4)

Three layers:

- **unit** — TrialSpec validation, state-machine transition table,
- **integration** — ERC-8183 full flow on testnet against a mock seller,
- **E2E** — discover → hire → see evidence.

Safety regression: `expired-session-rejected` — a call after session expiry must be rejected onchain. This is what makes "staged authorization" real, so it's a non-negotiable test.

## 14. Performance & caching (E5)

- 8004scan: paginate + server-side cache (200k agents).
- Real-time price / APR / onchain state: backend cache; no per-request RPC from the client.
- One orchestrator polls and dispatches; don't run one persistent process per agent.

## 15. Decisions (resolved)

- Custody: Altana self-custodial (§3) — **status: designed**. The observe stage
  grants a session with empty allowlist + zero spend cap (no asset-moving
  authority). The full EIP-7702 on-chain Keystore registration + one-click
  revoke path is documented here and surfaced in the UI, but is not yet deployed
  on-chain, so we do not claim live session-key transactions.
- Limited-execute — **status: code-complete, not live**. The seller implements a
  real, bounded, on-chain action (`mode=execute` → bounded `$U` transfer) with a
  seller HTTP evidence endpoint; it is verified locally. The seller-host redeploy
  is blocked by a Fly billing gate, so it is gated off in the live UI. Observe +
  real settlement-transaction evidence are live.
- Seller runner: orchestrator-embedded + retry (§11).
- Deploy: single Next.js full-stack (API routes), public URL through judging.
- Repo: GitHub (public).
- Market discovery: 8004scan semantic search per category, rendered with rich
  fields (owner, verified, score, feedback, protocols) via `src/lib/discovery.ts`.
