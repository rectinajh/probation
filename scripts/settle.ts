import { ERC8183Client, EVMWalletProvider, JobStatus, loadEnv } from "@bnbagent/sdk";

/**
 * Finalise a Submitted job after its dispute window elapses (900s on
 * bsc-testnet). Call as: pnpm settle <jobId>
 */
async function main() {
  loadEnv();
  const jobIdArg = process.argv[2];
  if (!jobIdArg) {
    console.error("usage: pnpm settle <jobId>");
    process.exit(1);
  }
  const jobId = BigInt(jobIdArg);

  const wallet = new EVMWalletProvider({
    password: process.env.WALLET_PASSWORD!,
  });
  const client = await ERC8183Client.create({
    walletProvider: wallet,
    network: process.env.NETWORK ?? "bsc-testnet",
  });

  console.log(`Settling job ${jobId} on bsc-testnet ...`);
  await client.settle(jobId);
  const job = await client.getJob(jobId);
  console.log("status:", JobStatus[job.status]);
}

main().catch((err) => {
  console.error("[settle] fatal", err);
  process.exit(1);
});
