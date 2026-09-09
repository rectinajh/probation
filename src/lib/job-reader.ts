import { ERC8183Client, EVMWalletProvider, JobStatus, loadEnv } from "@bnbagent/sdk";
import type { Category, ReportEvidence, Session } from "./domain";
import { getAdapter } from "./adapter-registry";

export interface JobSnapshot {
  jobId: number;
  status: string;
  statusCode: number;
  budget: string;
  submittedAt: string;
  provider: string;
  client: string;
  /** The account the evidence was computed for (the user's connected wallet). */
  subject: string;
  category: Category;
  mode: "observe" | "execute";
  /** Real on-chain execution result (mode=execute). */
  execution: {
    txHash: string;
    amount: string;
    to: string;
    block: string;
  } | null;
  report: ReportEvidence | null;
}

const CATEGORY_SET = new Set<Category>([
  "rebalancing",
  "grid-trading",
  "yield-optimisation",
  "health-factor-monitoring",
]);

function categoryFor(description: string): Category {
  const match = /category=([a-z-]+)/.exec(description)?.[1];
  if (match && CATEGORY_SET.has(match as Category)) {
    return match as Category;
  }
  return "health-factor-monitoring";
}

function sessionFor(subject: `0x${string}`): Session {
  return {
    sessionKey: subject,
    wallet: subject,
    allowlist: [],
    spendCap: 0n,
    expiry: BigInt(Math.floor(Date.now() / 1000)) + 3600n,
    keystoreRef: "erc8183-client",
    revoked: false,
  };
}

function modeFor(description: string): "observe" | "execute" {
  return /mode=execute/.test(description) ? "execute" : "observe";
}

async function fetchExecutionEvidence(
  jobId: number,
): Promise<JobSnapshot["execution"]> {
  const base = process.env.ERC8183_AGENT_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/job/${jobId}/evidence`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      txHash?: string;
      amount?: string;
      to?: string;
      block?: string;
    };
    return {
      txHash: data.txHash ?? "",
      amount: data.amount ?? "0",
      to: data.to ?? "",
      block: data.block ?? "",
    };
  } catch {
    return null;
  }
}

let clientPromise: Promise<ERC8183Client> | null = null;

function client(): Promise<ERC8183Client> {
  if (!clientPromise) {
    loadEnv();
    const wallet = new EVMWalletProvider({
      password: process.env.WALLET_PASSWORD!,
      privateKey: process.env.PRIVATE_KEY,
      persist: false,
    });
    clientPromise = ERC8183Client.create({
      walletProvider: wallet,
      network: process.env.NETWORK ?? "bsc-testnet",
    });
  }
  return clientPromise;
}

export async function readJob(jobId: number): Promise<JobSnapshot> {
  const c = await client();
  const job = await c.getJob(BigInt(jobId));

  // The monitored position is the address the buyer embedded in the task text
  // (the connected user's wallet). Fall back to job.client for legacy jobs.
  const description = String(job.description ?? "");
  const monitor = /monitor account=(0x[0-9a-fA-F]{40})/.exec(description)?.[1];
  const subject = (monitor ??
    job.client) as `0x${string}`;

  const category = categoryFor(description);
  const mode = modeFor(description);
  const submitted = job.status >= JobStatus.SUBMITTED;
  let report: ReportEvidence | null = null;
  let execution: JobSnapshot["execution"] = null;
  if (submitted && mode === "execute") {
    execution = await fetchExecutionEvidence(jobId);
  } else if (submitted) {
    // Recompute the current, deterministic report for this category so the
    // buyer's evidence card reflects the latest real on-chain state.
    const { evidence } = await getAdapter(category).run(
      String(jobId),
      sessionFor(subject),
    );
    report = evidence.report ?? null;
  }

  return {
    jobId,
    status: JobStatus[job.status],
    statusCode: Number(job.status),
    budget: job.budget.toString(),
    submittedAt: job.submittedAt.toString(),
    provider: job.provider,
    client: job.client,
    subject,
    category,
    mode,
    execution,
    report,
  };
}

export async function settleJob(jobId: number): Promise<{
  status: string;
  txHash: string;
}> {
  const c = await client();
  const res = await c.settle(BigInt(jobId));
  const job = await c.getJob(BigInt(jobId));
  return {
    status: JobStatus[job.status],
    txHash: res.transactionHash,
  };
}
