import { EVMWalletProvider, loadEnv } from "@bnbagent/sdk";
import { ERC8183JobOps, fundedJobWatcher } from "@bnbagent/sdk/erc8183";
import { LocalStorageProvider } from "@bnbagent/sdk/storage";

/**
 * Minimal seller-runner (E1). The ERC-8183 TypeScript SDK is transport
 * agnostic on the seller side: a headless polling loop, not an HTTP server.
 * This process polls for funded jobs, runs the seller work, and submits the
 * deliverable with idempotent retry. Deployment decision: embedded in the
 * orchestrator with simple retry; promote to a standalone process only if a
 * category outgrows it.
 */
export async function runSellerRunner() {
  loadEnv();

  const wallet = new EVMWalletProvider({
    password: process.env.WALLET_PASSWORD!,
  });

  const jobOps = await ERC8183JobOps.create({
    walletProvider: wallet,
    network: process.env.NETWORK ?? "bsc-testnet",
    storageProvider: new LocalStorageProvider("./.agent-data"),
    servicePrice: 1n * 10n ** 18n,
    agentUrl: process.env.ERC8183_AGENT_URL,
  });

  await fundedJobWatcher(
    jobOps,
    async (job) => {
      const jobId = job.jobId as number;
      // TODO: invoke the real ServiceAdapter for the job's category here.
      const result = await jobOps.submitResult(
        jobId,
        "computed result placeholder",
        { model: "probation-v1" },
      );
      if (!result.success) {
        return { retry: result.retryable === true };
      }
      return {};
    },
    { interval: 30 },
  );
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  runSellerRunner().catch((err) => {
    console.error("[seller-runner] fatal", err);
    process.exit(1);
  });
}

