import type { Address } from "viem";

export type Category =
  | "rebalancing"
  | "grid-trading"
  | "yield-optimisation"
  | "health-factor-monitoring";

export type Provenance = "provider-claim" | "platform-live-test" | "third-party-history";

/** Fixed contract for a single bounded trial. Never implied by a chat. */
export interface TrialSpec {
  taskId: string;
  agentId: string;
  provider: Address;
  category: Category;
  taskDescription: string;
  inputReferences: string[];
  network: "bsc-testnet" | "bsc-mainnet";
  protocol: string;
  agentVersion: string;
  configuration: string;
  serviceFee: bigint;
  executionBudget: bigint;
  allowedActions: string[];
  expiry: bigint;
  acceptanceCriteria: string;
  requiredEvidence: string[];
  dataFreshnessRequirements: string;
  failureAndRefundPolicy: string;
  provenance: Provenance;
}

export type OnchainJobState =
  | "created"
  | "funded"
  | "submitted"
  | "settled"
  | "disputed"
  | "expired";

export interface Session {
  sessionKey: Address;
  wallet: Address;
  allowlist: Address[];
  spendCap: bigint;
  expiry: bigint;
  keystoreRef: string;
  revoked: boolean;
}

export interface Evidence {
  evidenceId: string;
  jobId: string;
  kind: "tx" | "state" | "report";
  artifactRef: string;
  chainRef?: string;
  timestamp: bigint;
  /** Structured, renderable evidence payload. Populated by the observe-stage
   * adapters so the buyer-facing evidence card renders real numbers. */
  report?: ReportEvidence;
}

export type Verdict = "ok" | "warn" | "info";

export interface Metric {
  label: string;
  value: string;
  unit?: string;
}

/**
 * A renderable evidence report. Every field is a real, deterministic read or
 * computation — never a market screenshot or a claimed number.
 */
export interface ReportEvidence {
  title: string;
  /** One-line verdict summary. */
  headline: string;
  verdict: Verdict;
  metrics: Metric[];
  /** Where the data came from (contract + network). */
  source: string;
  /** Which on-chain reads produced it. */
  method: string;
  /** Block number the reads were taken at (deterministic re-run anchor). */
  block: string;
  /** Human note about the limits / what cannot be concluded. */
  note: string;
}
