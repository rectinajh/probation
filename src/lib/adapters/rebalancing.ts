import type { Evidence, Session, TrialSpec } from "../domain";
import type { Quote, RunResult, ServiceAdapter } from "../service-adapter";
import { readUserBalances } from "./venus";

const TARGET_RISK_PCT = 0.6; // target 60% risk (BNB) / 40% stable ($U)

function usd(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function token(n: number, sym: string): string {
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${sym}`;
}

/**
 * Observe-stage rebalancing. Reads the account's real on-chain balances (BNB +
 * $U stable) and a live Venus BNB price, computes the current vs target weight,
 * and states exactly what a rebalance would move. No funds are moved.
 */
export const rebalancingAdapter: ServiceAdapter = {
  async quote(inputs: TrialSpec): Promise<Quote> {
    return {
      serviceFee: inputs.serviceFee,
      executionBudget: 0n,
      allowedActions: ["read", "compute", "propose"],
      acceptanceCriteria: inputs.acceptanceCriteria,
      expiry: inputs.expiry,
    };
  },

  async run(job: string, session: Session): Promise<RunResult> {
    const { bnb, u, bnbUsd, block } = await readUserBalances(session.wallet);
    const bnbUnits = Number(bnb) / 1e18;
    const uUnits = Number(u) / 1e18;
    const riskUsd = bnbUnits * bnbUsd;
    const stableUsd = uUnits; // $U is a 1:1 USD stable
    const totalUsd = riskUsd + stableUsd;
    const hasFunds = totalUsd > 0;

    const currentRiskPct = hasFunds ? riskUsd / totalUsd : 0;
    const targetRiskUsd = hasFunds ? totalUsd * TARGET_RISK_PCT : 0;
    // +delta = under-weighted in risk (buy BNB). -delta = over-weighted (sell BNB).
    const deltaUsd = hasFunds ? targetRiskUsd - riskUsd : 0;
    const buyRisk = deltaUsd > 0;
    const absDeltaUsd = Math.abs(deltaUsd);
    const deltaBnb = absDeltaUsd / (bnbUsd || 1);

    const suggestion = !hasFunds
      ? "none — no on-chain assets detected"
      : buyRisk
        ? `buy ${deltaBnb.toFixed(6)} BNB with ${(absDeltaUsd).toFixed(2)} U`
        : `convert ${deltaBnb.toFixed(6)} BNB to ${absDeltaUsd.toFixed(2)} U`;

    const metrics = [
      {
        label: "Current risk weight (BNB)",
        value: hasFunds ? `${(currentRiskPct * 100).toFixed(1)}%` : "—",
      },
      {
        label: "Target risk weight",
        value: `${(TARGET_RISK_PCT * 100).toFixed(0)}%`,
      },
      {
        label: "BNB balance (live)",
        value: token(bnbUnits, "BNB"),
      },
      {
        label: "Stable balance ($U)",
        value: token(uUnits, "U"),
      },
      {
        label: "Live BNB price",
        value: usd(bnbUsd),
      },
      {
        label: hasFunds ? "Suggested move" : "Suggested move (needs funds)",
        value: suggestion,
      },
    ];

    const evidence: Evidence = {
      evidenceId: `${job}-rebalance`,
      jobId: job,
      kind: "report",
      artifactRef: `rebalance-report-${job}`,
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      report: {
        title: "Portfolio rebalancing plan",
        headline: hasFunds
          ? buyRisk
            ? "Under-weighted in risk — a rebalance would add BNB exposure."
            : "Over-weighted in risk — a rebalance would trim into stable."
          : "No on-chain assets to rebalance at this address.",
        verdict: hasFunds ? "ok" : "info",
        metrics,
        source: `BSC ${process.env.NETWORK ?? "bsc-testnet"} balances + Venus oracle`,
        method: "balanceOf(BNB, $U) + Venus getUnderlyingPrice(cBNB)",
        block,
        note:
          "Proposal only. Execution requires you to sign a new bounded, budgeted authorisation. One good rebalance is not proof of long-term outperformance.",
      },
    };

    return {
      evidence,
      notes: `totalUsd=${totalUsd.toFixed(2)} riskPct=${(currentRiskPct * 100).toFixed(1)}% deltaUsd=${deltaUsd.toFixed(2)}`,
    };
  },

  async submitEvidence(job: string, result: RunResult): Promise<Evidence> {
    return result.evidence;
  },

  async cancel(job: string, _session: Session): Promise<void> {
    void job;
  },
};
