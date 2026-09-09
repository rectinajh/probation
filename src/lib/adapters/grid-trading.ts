import type { Evidence, Session, TrialSpec } from "../domain";
import type { Quote, RunResult, ServiceAdapter } from "../service-adapter";
import { readUserBalances } from "./venus";

const GRID_LEVELS = 6;
const RANGE_PCT = 0.1; // ±10% around the current price

function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

/**
 * Observe-stage grid-trading planner. Reads a live BNB price and the account's
 * available stable capital, then computes a bounded, budget-capped grid plan
 * (range, levels, spacing, capital per level). No orders are placed.
 */
export const gridTradingAdapter: ServiceAdapter = {
  async quote(inputs: TrialSpec): Promise<Quote> {
    return {
      serviceFee: inputs.serviceFee,
      executionBudget: 0n,
      allowedActions: ["read", "compute", "plan"],
      acceptanceCriteria: inputs.acceptanceCriteria,
      expiry: inputs.expiry,
    };
  },

  async run(job: string, session: Session): Promise<RunResult> {
    const { bnb, u, bnbUsd, block } = await readUserBalances(session.wallet);
    const capitalUsd = Number(u) / 1e18; // grid runs on stable capital
    const lower = bnbUsd * (1 - RANGE_PCT);
    const upper = bnbUsd * (1 + RANGE_PCT);
    const spacingBps = (RANGE_PCT * 2) / (GRID_LEVELS - 1);
    const perLevelUsd = capitalUsd / GRID_LEVELS;
    const bnbPerLevel = bnbUsd > 0 ? perLevelUsd / bnbUsd : 0;
    const avgBuyPrice = (lower + upper) / 2;

    const metrics = [
      { label: "Live BNB price", value: `$${bnbUsd.toFixed(2)}` },
      { label: "Grid range", value: `$${lower.toFixed(2)} – $${upper.toFixed(2)}` },
      { label: "Grid levels", value: String(GRID_LEVELS) },
      {
        label: "Grid spacing",
        value: pct(spacingBps),
        unit: "per level",
      },
      {
        label: "Stable capital available",
        value: `$${capitalUsd.toFixed(2)}`,
      },
      {
        label: capitalUsd > 0 ? "Capital per level" : "Capital per level (needs funds)",
        value: capitalUsd > 0 ? `$${perLevelUsd.toFixed(2)}` : "none",
      },
      {
        label: "Rough BNB/level @ mid",
        value: bnbPerLevel > 0 ? `${bnbPerLevel.toFixed(4)} BNB` : "—",
      },
      {
        label: "Break-even mid price",
        value: `$${avgBuyPrice.toFixed(2)}`,
      },
    ];

    const evidence: Evidence = {
      evidenceId: `${job}-grid`,
      jobId: job,
      kind: "report",
      artifactRef: `grid-report-${job}`,
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      report: {
        title: "Bounded grid-trading plan",
        headline: capitalUsd > 0
          ? `A ${GRID_LEVELS}-level grid between $${lower.toFixed(0)} and $${upper.toFixed(0)} using $${capitalUsd.toFixed(2)} of stable.`
          : "No stable capital detected — grid plan computed against a live BNB price for reference.",
        verdict: capitalUsd > 0 ? "ok" : "info",
        metrics,
        source: "BSC testnet balances + Venus oracle (price)",
        method: "readUserBalances + grid parameterisation",
        block,
        note:
          "Plan only. Placing orders is not filling them, and a grid can lose in a one-way move. Requires a new bounded, budgeted authorisation with a stop before execution.",
      },
    };

    return {
      evidence,
      notes: `price=${bnbUsd.toFixed(2)} capital=${capitalUsd.toFixed(2)} range=$${lower.toFixed(2)}-$${upper.toFixed(2)}`,
    };
  },

  async submitEvidence(job: string, result: RunResult): Promise<Evidence> {
    return result.evidence;
  },

  async cancel(job: string, _session: Session): Promise<void> {
    void job;
  },
};
