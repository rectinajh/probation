import { ERC8183Client, EVMWalletProvider, JobStatus, loadEnv } from "@bnbagent/sdk";
import { readHealthFactor } from "./adapters/health-factor";

export interface JobSnapshot {
  jobId: number;
  status: string;
  statusCode: number;
  budget: string;
  submittedAt: string;
  provider: string;
  client: string;
  evidence: {
    liquidity: string;
    shortfall: string;
    status: "healthy" | "at-risk";
  } | null;
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

  const submitted = job.status >= JobStatus.SUBMITTED;
  let evidence: JobSnapshot["evidence"] = null;
  if (submitted) {
    const hf = await readHealthFactor(job.client);
    evidence = {
      liquidity: hf.liquidity.toString(),
      shortfall: hf.shortfall.toString(),
      status: hf.status,
    };
  }

  return {
    jobId,
    status: JobStatus[job.status],
    statusCode: Number(job.status),
    budget: job.budget.toString(),
    submittedAt: job.submittedAt.toString(),
    provider: job.provider,
    client: job.client,
    evidence,
  };
}

export async function settleJob(jobId: number): Promise<string> {
  const c = await client();
  await c.settle(BigInt(jobId));
  const job = await c.getJob(BigInt(jobId));
  return JobStatus[job.status];
}
