import { createPublicClient, http, parseAbi } from "viem";
import { bscTestnet } from "viem/chains";
import type { Evidence, Session, TrialSpec } from "../domain";
import type { Quote, RunResult, ServiceAdapter } from "../service-adapter";

const comptrollerAbi = parseAbi([
  // NOTE: the first return value is named `errCode` here because abitype's
  // human-readable ABI parser rejects `error` (a protected Solidity keyword).
  "function getAccountLiquidity(address account) view returns (uint256 errCode, uint256 liquidity, uint256 shortfall)",
]);

// Venus Unitroller (Comptroller proxy) on BSC testnet (chain 97). Override with
// VENUS_COMPTROLLER for mainnet (0xfD36E2c2a6789Db23113685031d7F16329158384).
// This is read-only, so it never moves funds.
const DEFAULT_COMPTROLLER = "0x94d1820b2D1c7c7452A163983Dc888CEC546b77D";

/**
 * Observe-stage health-factor monitor. Read-only, no fund movement. Reads the
 * Venus Comptroller's getAccountLiquidity to report real liquidation risk.
 */
export const healthFactorAdapter: ServiceAdapter = {
  async quote(inputs: TrialSpec): Promise<Quote> {
    return {
      serviceFee: inputs.serviceFee,
      executionBudget: 0n, // observe stage: no funds moved
      allowedActions: ["read", "alert"],
      acceptanceCriteria: inputs.acceptanceCriteria,
      expiry: inputs.expiry,
    };
  },

  async run(job: string, session: Session): Promise<RunResult> {
    const rpcUrl = process.env.RPC_URL ?? "https://bsc-testnet-rpc.publicnode.com";
    const comptroller = (process.env.VENUS_COMPTROLLER ??
      DEFAULT_COMPTROLLER) as `0x${string}`;

    const client = createPublicClient({
      chain: bscTestnet,
      transport: http(rpcUrl),
    });

    const result = (await client.readContract({
      address: comptroller,
      abi: comptrollerAbi,
      functionName: "getAccountLiquidity",
      args: [session.wallet],
    })) as [bigint, bigint, bigint];

    const [, liquidity, shortfall] = result;

    // shortfall > 0 means the account is below its borrow limit (at risk).
    const status = shortfall > 0n ? "at-risk" : "healthy";

    const evidence: Evidence = {
      evidenceId: `${job}-health-factor`,
      jobId: job,
      kind: "report",
      artifactRef: `health-factor-report-${job}`,
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
    };

    return {
      evidence,
      notes: `account=${session.wallet} liquidity=${liquidity} shortfall=${shortfall} status=${status}`,
    };
  },

  async submitEvidence(job: string, result: RunResult): Promise<Evidence> {
    return result.evidence;
  },

  async cancel(job: string, _session: Session): Promise<void> {
    // Observe stage: nothing was deployed, so cancellation is a no-op.
  },
};
