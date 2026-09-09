import { EVMWalletProvider, loadEnv } from "@bnbagent/sdk";
import { ERC8183JobOps, fundedJobWatcher } from "@bnbagent/sdk/erc8183";
import { LocalStorageProvider } from "@bnbagent/sdk/storage";
import type { Category, Session } from "./domain";
import { getAdapter } from "./adapter-registry";

/**
 * Minimal seller-runner. The ERC-8183 TypeScript SDK is transport agnostic on
 * the seller side: a headless polling loop, not an HTTP server. This process
 * polls funded jobs, runs the category's ServiceAdapter, and submits the
 * deliverable with idempotent retry.
 *
 * Deployment decision: embedded in the orchestrator with simple retry.
 */
const DEFAULT_CATEGORY: Category = "health-factor-monitoring";

function placeholderSession(): Session {
  // TODO: derive from the real Altana session granted for this job.
  const zero = "0x0000000000000000000000000000000000000000" as `0x${string}`;
  return {
    sessionKey: zero,
    wallet: zero,
    allowlist: [],
    spendCap: 0n,
    expiry: BigInt(Math.floor(Date.now() / 1000)) + 3600n,
    keystoreRef: "demo",
    revoked: false,
  };
}

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
      // TODO: route by actual job category / agent once the Job schema is
      // confirmed. Defaults to the observe-stage health-factor adapter.
      const adapter = getAdapter(DEFAULT_CATEGORY);
      const session = placeholderSession();
      const { evidence } = await adapter.run(String(jobId), session);

      const result = await jobOps.submitResult(jobId, evidence.artifactRef, {
        model: "probation-v1",
        evidenceKind: evidence.kind,
      });
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

