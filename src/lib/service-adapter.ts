import type { Evidence, Session, TrialSpec } from "./domain";

/** A Quote the user sees before committing. */
export interface Quote {
  serviceFee: bigint;
  executionBudget: bigint;
  allowedActions: string[];
  acceptanceCriteria: string;
  expiry: bigint;
}

export interface RunResult {
  evidence: Evidence;
  notes: string;
}

/**
 * One shell, four divergent-free implementations. Each category implements
 * this interface; the discovery / quote / hire / evidence UI stays shared.
 * DRY comes from the interface, not from copied code.
 */
export interface ServiceAdapter {
  quote(inputs: TrialSpec): Promise<Quote>;
  run(job: string, session: Session): Promise<RunResult>;
  submitEvidence(job: string, result: RunResult): Promise<Evidence>;
  cancel(job: string, session: Session): Promise<void>;
}

