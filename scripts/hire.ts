import { loadEnv } from "@bnbagent/sdk";
import { hireAgent } from "../src/lib/erc8183";

async function main() {
  loadEnv();
  const provider = process.env.PROVIDER_ADDRESS;
  if (!provider) {
    console.error("PROVIDER_ADDRESS is not set in .env");
    process.exit(1);
  }

  // budget is in whole "U" (United Stables) units, 18 decimals. The first
  // positional arg is the budget, the rest is the job description. Example:
  //   pnpm hire 1 "Monitor this lending position's health factor"
  const budgetArg = process.argv[2] ?? "1";
  const budget = BigInt(budgetArg) * 10n ** 18n;
  const description =
    process.argv[3] ?? "Monitor this lending position's health factor (observe stage)";

  console.log(
    `Hiring ${provider} on bsc-testnet with budget ${budgetArg} U ...`,
  );
  const result = await hireAgent({ provider, description, budget });
  console.log("jobId:", result.jobId);
  console.log("status:", result.status);
}

main().catch((err) => {
  console.error("[hire] fatal", err);
  process.exit(1);
});
