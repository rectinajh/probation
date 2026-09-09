import { ERC8183Client, EVMWalletProvider, JobStatus, loadEnv } from "@bnbagent/sdk";
import {
  NegotiationHandler,
  NegotiationRequest,
  TermSpecification,
  buildJobDescription,
} from "@bnbagent/sdk/erc8183";

export interface HireInput {
  provider: string;
  description: string;
  budget: bigint;
  /** The account to monitor (the user's connected wallet). The seller-runner
   * reads this from the job description and falls back to job.client. */
  monitorAddress?: string;
  terms?: {
    deliverables: string;
    qualityStandards: string;
    successCriteria?: string[];
  };
}

/**
 * Thin wrapper around the buyer side of ERC-8183.
 * negotiate (signed quote) -> createJob -> registerJob -> setBudget -> fund.
 */
export async function hireAgent(input: HireInput) {
  loadEnv();

  // In-memory wallet: Vercel serverless has a read-only filesystem, so the
  // SDK's default keystore persistence (~/.bnbagent/wallets) would fail. The
  // private key is held only in process memory for the life of the request.
  const wallet = new EVMWalletProvider({
    password: process.env.WALLET_PASSWORD!,
    privateKey: process.env.PRIVATE_KEY,
    persist: false,
  });
  const client = await ERC8183Client.create({
    walletProvider: wallet,
    network: process.env.NETWORK ?? "bsc-testnet",
  });

  // Self-hire demo: the same wallet is buyer and provider, so it signs its own
  // negotiation quote. The signed quote is embedded in job.description and is
  // verified by the seller-runner before any work happens.
  const price = input.budget.toString();
  const handler = await NegotiationHandler.fromErc8183Client(client, {
    servicePrice: price,
    walletProvider: wallet,
  });

  const terms = input.terms ?? {
    deliverables: "Health-factor report (observe stage)",
    qualityStandards:
      "Read-only Venus getAccountLiquidity; flag account at-risk when shortfall > 0",
    successCriteria: [
      "Report includes liquidity and shortfall for the account",
    ],
  };

  // The monitored account is the user's connected wallet. Embed it in the
  // signed task text so the seller-runner can monitor the right position.
  const monitorSuffix = input.monitorAddress
    ? ` monitor account=${input.monitorAddress}`
    : "";

  const request = new NegotiationRequest({
    taskDescription: `${input.description}${monitorSuffix}`,
    terms: new TermSpecification(terms),
  });

  const negotiation = await handler.negotiate(request.toDict(), { price });
  if (!negotiation.accepted) {
    throw new Error(
      `Negotiation rejected: ${JSON.stringify(negotiation.response)}`,
    );
  }
  const description = buildJobDescription(negotiation.toDict());

  const disputeWindow = await client.policy.disputeWindow();
  // expiredAt must clear disputeWindow + a safety buffer, or createJob throws.
  // The provider must submit by (expiredAt - disputeWindow), so the buffer is
  // effectively the submit window. 1 day gives the seller-runner ample time to
  // poll and submit (a 10-minute buffer was too tight for the Fly deploy loop).
  const expiredAt =
    BigInt(Math.floor(Date.now() / 1000)) + disputeWindow + 86400n;

  const { jobId } = await client.createJob({
    provider: input.provider,
    expiredAt,
    description,
  });
  await client.registerJob(jobId!);
  // The kernel requires setBudget() to be called before fund(): fund() reverts
  // with ZeroBudget() when jobHasBudget is false, regardless of the amount.
  // A zero budget is legal (a "free job") — it just skips the token transfer.
  await client.setBudget(jobId!, input.budget);
  await client.fund(jobId!, input.budget);

  const job = await client.getJob(jobId!);
  return { jobId, status: JobStatus[job.status] };
}
