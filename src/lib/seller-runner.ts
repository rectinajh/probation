import { createServer } from "node:http";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EVMWalletProvider, loadEnv } from "@bnbagent/sdk";
import { ERC8183JobOps, fundedJobWatcher } from "@bnbagent/sdk/erc8183";
import { LocalStorageProvider } from "@bnbagent/sdk/storage";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc, bscTestnet } from "viem/chains";
import type { Category, Session } from "./domain";
import { getAdapter } from "./adapter-registry";

const DEFAULT_CATEGORY: Category = "health-factor-monitoring";
const U_TOKEN = "0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565" as const;
const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
]);

const CATEGORY_SET = new Set<Category>([
  "rebalancing",
  "grid-trading",
  "yield-optimisation",
  "health-factor-monitoring",
]);

interface Tags {
  category: Category;
  monitor: string | null;
  mode: "observe" | "execute";
  to: string | null;
  cap: bigint | null;
}

function tagsOf(description: string): Tags {
  const cat = /category=([a-z-]+)/.exec(description)?.[1];
  const monitor = /monitor account=(0x[0-9a-fA-F]{40})/.exec(description)?.[1] ?? null;
  const mode = /mode=(execute|observe)/.exec(description)?.[1] as
    | "execute"
    | "observe"
    | undefined;
  const to = / to=(0x[0-9a-fA-F]{40})/.exec(description)?.[1] ?? null;
  const cap = /cap=(\d+)/.exec(description)?.[1];
  return {
    category:
      cat && CATEGORY_SET.has(cat as Category) ? (cat as Category) : DEFAULT_CATEGORY,
    monitor,
    mode: mode ?? "observe",
    to,
    cap: cap ? BigInt(cap) : null,
  };
}

function sessionFor(job: Record<string, unknown>, monitor: string | null): Session {
  const client =
    (monitor as `0x${string}`) ??
    ((typeof job.client === "string" && job.client.startsWith("0x")
      ? job.client
      : "0x0000000000000000000000000000000000000000") as `0x${string}`);
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

function evidenceFile(jobId: number): string {
  return path.join(".agent-data", `exec-${jobId}.json`);
}

function startEvidenceServer(): ReturnType<typeof createServer> {
  const port = Number(process.env.PORT ?? 8080);
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const json = (code: number, payload: unknown) => {
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
    };
    if (url.pathname === "/healthz") return json(200, { ok: true });
    const m = /^\/job\/(\d+)\/evidence$/.exec(url.pathname);
    if (m) {
      const f = evidenceFile(Number(m[1]));
      if (existsSync(f)) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(readFileSync(f, "utf8"));
        return;
      }
      return json(404, { error: "not found" });
    }
    json(404, { error: "not found" });
  });
  server.listen(port, () => console.log(`[seller] evidence server on :${port}`));
  return server;
}

function chainFor() {
  return (process.env.NETWORK ?? "bsc-testnet") === "bsc-mainnet" ? bsc : bscTestnet;
}

async function executeBounded(
  jobId: number,
  to: `0x${string}`,
  cap: bigint,
): Promise<{ txHash: `0x${string}`; amount: bigint; block: string }> {
  const chain = chainFor();
  const rpc =
    process.env.RPC_URL ?? "https://bsc-testnet-rpc.publicnode.com";
  const pk = process.env.PRIVATE_KEY as `0x${string}`;
  const account = privateKeyToAccount(pk);
  const pub = createPublicClient({ chain, transport: http(rpc) });
  const wal = createWalletClient({ account, chain, transport: http(rpc) });
  const balance = (await pub.readContract({
    address: U_TOKEN,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  })) as bigint;
  const amount = balance < cap ? balance : cap;
  const txHash = await wal.writeContract({
    address: U_TOKEN,
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, amount],
    chain,
    account,
  });
  const block = await pub.getBlockNumber();
  return { txHash, amount, block: block.toString() };
}

export async function runSellerRunner() {
  loadEnv();

  const wallet = new EVMWalletProvider({
    password: process.env.WALLET_PASSWORD!,
    privateKey: process.env.PRIVATE_KEY, // first-run import in a fresh container
  });

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

  startEvidenceServer();

  await fundedJobWatcher(
    jobOps,
    async (job) => {
      const jobId = job.jobId as number;
      const description = String(job.description ?? "");
      const t = tagsOf(description);

      if (t.mode === "execute") {
        const to = (t.to ?? job.client) as `0x${string}`;
        const cap = t.cap ?? 1n * 10n ** 18n;
        const exec = await executeBounded(jobId, to, cap);
        writeFileSync(
          evidenceFile(jobId),
          JSON.stringify({
            jobId,
            txHash: exec.txHash,
            amount: exec.amount.toString(),
            to,
            block: exec.block,
          }),
        );
        const result = await jobOps.submitResult(
          jobId,
          JSON.stringify({ mode: "execute", txHash: exec.txHash, amount: exec.amount.toString(), to }),
          { model: "probation-v1", evidenceKind: "tx", txHash: exec.txHash },
        );
        if (!result.success) return { retry: result.retryable === true };
        return {};
      }

      // Observe stage: run the category's read-only adapter.
      const adapter = getAdapter(t.category);
      const session = sessionFor(job, t.monitor);
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
    { interval: 5 },
  );
}
