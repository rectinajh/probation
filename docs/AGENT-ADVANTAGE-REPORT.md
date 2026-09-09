# Agent Advantage Report — template

TermiX scores 30% of its rubric on "proven agent advantage", backed by this
report. Rules that cannot be violated:

- At least **3 real tasks**, each run **both ways**: with an agent hired through
  PROBATION vs without it.
- At least **one** task from trading, stock, or security.
- Report **time, cost, output quality**, with the **actual outputs attached**.
- Never fabricate. Un-run results stay empty or marked **待测 (pending)**.

## Experiment 1 — LP rebalancing (prepare + approved execution)

- Task & inputs: _待测_
- Agent identity, version, config: `probation-health-factor-monitor` / agent id `2296` / _version 待测_
- Baseline method & tools: _待测_
- Pre-agreed acceptance criteria: _待测_
- Active time (user) / total time: _待测_ / _待测_
- Cost breakdown (service fee / gas / call / retries): _待测_
- Quality result, failures, human intervention: _待测_
- Artifact & evidence location: _待测_
- Network, block range / time range: BSC testnet / _待测_
- Limitations & what cannot be concluded: _待测_

## Experiment 2 — Yield migration evaluation

- Task & inputs: _待测_
- Agent identity, version, config: _待测_
- Baseline method & tools: _待测_
- Pre-agreed acceptance criteria: _待测_
- Active time (user) / total time: _待测_ / _待测_
- Cost breakdown: _待测_
- Quality result, failures, human intervention: _待测_
- Artifact & evidence location: _待测_
- Network, block range / time range: BSC testnet / _待测_
- Limitations & what cannot be concluded: _待测_

## Experiment 3 — Wallet authorization security check (SECURITY category)

This satisfies the "trading/stock/security" requirement. Read-only + revocation:
zero real-fund risk, real onchain evidence.

- Task & inputs: scan a wallet's onchain authorizations against a checklist
- Agent identity, version, config: _待测_
- Baseline method & tools: existing tools + a written checklist
- Pre-agreed acceptance criteria: missed approvals, false positives, wall-clock time, revoked approvals
- Active time (user) / total time: _待测_ / _待测_
- Cost breakdown: _待测_
- Quality result, failures, human intervention: _待测_
- Artifact & evidence location: _待测_
- Network, block range / time range: BSC testnet / _待测_
- Limitations & what cannot be concluded: _待测_

## Trading-specific section (required if any task is trading)

- Observation window, trade count, fees, risk exposure, realized result: _待测_

## Honesty guardrails

- Testnet results must never be presented as mainnet results.
- Historical replay must never be presented as live execution.
- Keep failed, timed-out, and human-intervened runs; don't publish only successes.
- State the sample size; with n=1 the conclusion applies to that sample only.

