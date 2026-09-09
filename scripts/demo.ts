import {
  ERC8183Client,
  EVMWalletProvider,
  JobStatus,
  loadEnv,
} from "@bnbagent/sdk";
import { hireAgent } from "../src/lib/erc8183";

function log(step: string, msg: string) {
  const t = new Date().toLocaleTimeString("en-GB", { hour12: false });
  console.log(`  [${t}] ${step.padEnd(6)} ${msg}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  loadEnv();

  const provider = process.env.PROVIDER_ADDRESS;
  if (!provider) throw new Error("PROVIDER_ADDRESS is not set in .env");

  const budgetArg = process.argv[2] ?? "1";
  const budget = BigInt(budgetArg) * 10n ** 18n;
  const description =
    process.argv[3] ??
    "PROBATION: monitor this lending position's health factor (observe stage)";

  const wallet = new EVMWalletProvider({
    password: process.env.WALLET_PASSWORD!,
  });
  const client = await ERC8183Client.create({
    walletProvider: wallet,
    network: process.env.NETWORK ?? "bsc-testnet",
  });

  console.log("\nPROBATION — Evidence Before Trust (live demo)\n");
  log("1/4", `Hiring ${provider} — ${budgetArg} U escrow`);
  const { jobId } = await hireAgent({ provider, description, budget });
  log("1/4", `job #${jobId} created + funded (status: FUNDED)`);

  log("2/4", "Waiting for the agent to produce on-chain evidence...");
  const deadline = Date.now() + 180_000;
  let job = await client.getJob(jobId!);
  while (job.status < JobStatus.SUBMITTED && Date.now() < deadline) {
    await sleep(1500);
    job = await client.getJob(jobId!);
  }
  if (job.status < JobStatus.SUBMITTED) {
    throw new Error(`job #${jobId} was not submitted within the timeout`);
  }
  log("2/4", `evidence submitted on-chain (status: ${JobStatus[job.status]})`);

  const disputeWindow = await client.policy.disputeWindow();
  log("3/4", `Optimistic dispute window (${disputeWindow}s) — waiting...`);
  const settleAt = Number(job.submittedAt) + Number(disputeWindow) + 1;
  while (Math.floor(Date.now() / 1000) < settleAt) {
    await sleep(500);
  }

  log("4/4", "Settling — releasing escrow to the agent");
  await client.settle(jobId!);
  job = await client.getJob(jobId!);
  log("4/4", `final status: ${JobStatus[job.status]} — escrow released`);

  console.log(`\nDone. jobId=${jobId} status=${JobStatus[job.status]}\n`);
}

main().catch((err) => {
  console.error("[demo] fatal", err);
  process.exit(1);
});
