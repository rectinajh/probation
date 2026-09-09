import { ERC8183Client, EVMWalletProvider, JobStatus, loadEnv } from "@bnbagent/sdk";

export interface HireInput {
  provider: string;
  description: string;
  budget: bigint;
}

/**
 * Thin wrapper around the buyer side of ERC-8183.
 * createJob -> registerJob -> fund -> settle.
 */
export async function hireAgent(input: HireInput) {
  loadEnv();

  const wallet = new EVMWalletProvider({
    password: process.env.WALLET_PASSWORD!,
  });
  const client = await ERC8183Client.create({
    walletProvider: wallet,
    network: process.env.NETWORK ?? "bsc-testnet",
  });

  const disputeWindow = await client.policy.disputeWindow();
  // expiredAt must clear disputeWindow + a safety buffer, or createJob throws.
  const expiredAt = BigInt(Math.floor(Date.now() / 1000)) + disputeWindow + 600n;

  const { jobId } = await client.createJob({
    provider: input.provider,
    expiredAt,
    description: input.description,
  });
  await client.registerJob(jobId!);
  await client.fund(jobId!, input.budget);

  const job = await client.getJob(jobId!);
  return { jobId, status: JobStatus[job.status] };
}

