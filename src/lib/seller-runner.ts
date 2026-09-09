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

function sessionFor(job: Record<string, unknown>): Session {
  // The monitored account is the connected user's wallet, which the buyer
  // embeds in the signed task text (`monitor account=<addr>`). Fall back to
  // job.client for jobs created without an explicit monitor address. Altana
  // session scoping (allowlist / spend cap / expiry) is a follow-up; observe
  // stage is read-only so this is safe.
  const description = String(job.description ?? "");
  const monitor = /monitor account=(0x[0-9a-fA-F]{40})/.exec(description)?.[1];
  const client = (monitor ||
    (typeof job.client === "string" && job.client.startsWith("0x")
      ? job.client
      : "0x0000000000000000000000000000000000000000")) as `0x${string}`;
  return {
    sessionKey: client,
    wallet: client,
    allowlist: [],
    spendCap: 0n,
    expiry: BigInt(Math.floor(Date.now() / 1000)) + 3600n,
    keystoreRef: "erc8183-client",
    revoked: false,
  };
}

export async function runSellerRunner() {
  loadEnv();

  const wallet = new EVMWalletProvider({
    password: process.env.WALLET_PASSWORD!,
    privateKey: process.env.PRIVATE_KEY, // first-run import in a fresh container
  });

  // Minimum budget this provider accepts, in raw "U" units (18 decimals).
  // Set ERC8183_SERVICE_PRICE=0 for a zero-budget demo job.
  const servicePrice = process.env.ERC8183_SERVICE_PRICE
    ? BigInt(process.env.ERC8183_SERVICE_PRICE)
    : 1n * 10n ** 18n;

  const jobOps = await ERC8183JobOps.create({
    walletProvider: wallet,
    network: process.env.NETWORK ?? "bsc-testnet",
    storageProvider: new LocalStorageProvider("./.agent-data"),
    servicePrice,
    agentUrl: process.env.ERC8183_AGENT_URL,
  });

  await fundedJobWatcher(
    jobOps,
    async (job) => {
      const jobId = job.jobId as number;
      const adapter = getAdapter(DEFAULT_CATEGORY);
      const session = sessionFor(job);
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
    // 5s poll so a live demo settles fast (the policy dispute window is 9s).
    { interval: 5 },
  );
}
