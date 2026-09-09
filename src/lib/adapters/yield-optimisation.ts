import type { Evidence, Metric, Session, TrialSpec } from "../domain";
import type { Quote, RunResult, ServiceAdapter } from "../service-adapter";
import { listMarkets, readUserBalances } from "./venus";

function pct(x: number): string {
  return `${(x * 100).toFixed(2)}%`;
}

function scale(raw: bigint): string {
  // Testnet tokens are 18-decimals normalized; show human units.
  return (Number(raw) / 1e18).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

/**
 * Observe-stage yield-optimisation comparison. Reads the live Venus supply
 * APY for every market, ranks them, and reports where a user's collateral is
 * earning today. Deterministic, read-only, no funds moved.
 */
export const yieldOptimisationAdapter: ServiceAdapter = {
  async quote(inputs: TrialSpec): Promise<Quote> {
    return {
      serviceFee: inputs.serviceFee,
      executionBudget: 0n,
      allowedActions: ["read", "compare", "recommend"],
      acceptanceCriteria: inputs.acceptanceCriteria,
      expiry: inputs.expiry,
    };
  },

  async run(job: string, session: Session): Promise<RunResult> {
    const markets = await listMarkets();
    const ranked = [...markets].sort((a, b) => b.supplyApy - a.supplyApy);
    const { bnb, u, bnbUsd, block } = await readUserBalances(session.wallet);

    // Dedupe by symbol (testnet can list multiple markets for one asset),
    // keeping the highest live supply APY per symbol.
    const deduped = new Map<string, (typeof ranked)[number]>();
    for (const m of ranked) {
      const existing = deduped.get(m.symbol);
      if (!existing || m.supplyApy > existing.supplyApy) deduped.set(m.symbol, m);
    }
    const distinct = [...deduped.values()].sort((a, b) => b.supplyApy - a.supplyApy);
    const top = distinct.filter((m) => m.supplyApy > 0).slice(0, 5);
    const best = top[0] ?? null;
    const bnbValueUsd = (Number(bnb) / 1e18) * bnbUsd;
    const totalUsd = bnbValueUsd + Number(u) / 1e18;

    const metrics: Metric[] = top.map((m, i) => ({
      label: `${i + 1}. ${m.symbol}`,
      value: pct(m.supplyApy),
      unit: "APY",
    }));
    metrics.push(
      {
        label: "Total value held (your address)",
        value: `$${totalUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
      },
      {
        label: "BNB (live price)",
        value: `$${bnbUsd.toFixed(2)}`,
      },
      {
        label: "Markets scanned",
        value: String(markets.length),
      },
    );

    const evidence: Evidence = {
      evidenceId: `${job}-yield`,
      jobId: job,
      kind: "report",
      artifactRef: `yield-report-${job}`,
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      report: {
        title: "Venus supply APY ranking",
        headline: best
          ? `Best live supply rate today: ${best.symbol} at ${pct(best.supplyApy)}.`
          : "No active Venus supply market detected.",
        verdict: best ? "ok" : "info",
        metrics,
        source: `Venus Unitroller (${process.env.NETWORK ?? "bsc-testnet"})`,
        method: "getAllMarkets + supplyRatePerBlock (annualised)",
        block,
        note:
          "APY is the current per-block supply rate annualised; it changes with utilisation and is not a guaranteed return. Nominal APY ≠ realized user return. Observation only — no funds moved.",
      },
    };

    return {
      evidence,
      notes: `markets=${markets.length} best=${best?.symbol ?? "none"}@${pct(best?.supplyApy ?? 0)} userUsd=${totalUsd.toFixed(2)}`,
    };
  },

  async submitEvidence(job: string, result: RunResult): Promise<Evidence> {
    return result.evidence;
  },

  async cancel(job: string, _session: Session): Promise<void> {
    void job;
  },
};
