import type { Evidence, Session, TrialSpec } from "../domain";
import type { Quote, RunResult, ServiceAdapter } from "../service-adapter";

/**
 * Observe-stage health-factor monitor. Read-only, no fund movement. This is the
 * safest category to demo first and matches the "staged authorization" plan.
 */
export const healthFactorAdapter: ServiceAdapter = {
  async quote(inputs: TrialSpec): Promise<Quote> {
    return {
      serviceFee: inputs.serviceFee,
      executionBudget: 0n, // observe stage: no funds moved
      allowedActions: ["read", "alert"],
      acceptanceCriteria: inputs.acceptanceCriteria,
      expiry: inputs.expiry,
    };
  },

  async run(job: string, _session: Session): Promise<RunResult> {
    // TODO: fetch the lending position (Venus / Aave) and compute the health
    // factor. Observe stage only — no transactions, no fund movement.
    const evidence: Evidence = {
      evidenceId: `${job}-health-factor`,
      jobId: job,
      kind: "report",
      artifactRef: `health-factor-report-${job}`,
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
    };
    return { evidence, notes: "Observe-stage health-factor report (demo placeholder)." };
  },

  async submitEvidence(job: string, result: RunResult): Promise<Evidence> {
    return result.evidence;
  },

  async cancel(job: string, _session: Session): Promise<void> {
    // Observe stage: nothing was deployed, so cancellation is a no-op.
  },
};

