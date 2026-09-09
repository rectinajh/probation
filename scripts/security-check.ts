import { createPublicClient, http, parseAbi } from "viem";
import { bsc, bscTestnet } from "viem/chains";

/**
 * Read-only wallet authorization security check. Scans ERC-20 allowances from
 * a wallet to common DApps, and reports non-zero (revocable) approvals.
 *
 * This is the "security" experiment for the Agent Advantage Report. It moves no
 * funds and requires no keys — only RPC reads.
 */

const ERC20_ABI = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function symbol() view returns (string)",
]);

// BSC mainnet addresses (well-known, stable). For testnet, swap these out.
const TOKENS = [
  { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955" },
  { symbol: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" },
  { symbol: "BUSD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56" },
  { symbol: "WBNB", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" },
] as const;

const SPENDERS = [
  { name: "PancakeSwap V2 Router", address: "0x10ED43C718714eb63d5aA57B78B54704E256024E" },
  { name: "PancakeSwap V3 Router", address: "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4" },
  { name: "Venus Comptroller", address: "0xfD36E2c2a6789Db23113685031d7F16329158384" },
] as const;

async function main() {
  const wallet = (process.argv[2] ?? process.env.CHECK_WALLET) as
    | `0x${string}`
    | undefined;
  if (!wallet) {
    console.error("usage: pnpm security-check <0x-wallet-address>");
    process.exit(1);
  }

  const testnet = process.env.NETWORK === "bsc-testnet";
  const chain = testnet ? bscTestnet : bsc;
  const rpcUrl =
    process.env.RPC_URL ??
    (testnet
      ? "https://bsc-testnet-rpc.publicnode.com"
      : "https://bsc-dataseed.bnbchain.org");

  const client = createPublicClient({ chain, transport: http(rpcUrl) });

  console.log(`Checking authorizations for ${wallet} on ${chain.name}`);
  let found = 0;

  for (const token of TOKENS) {
    for (const spender of SPENDERS) {
      const allowance = (await client.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [wallet, spender.address],
      })) as bigint;

      if (allowance > 0n) {
        found += 1;
        console.log(
          `  RISK: ${token.symbol} approved ${spender.name} for ${allowance} raw units`,
        );
      }
    }
  }

  console.log(found > 0 ? `\n${found} revocable approval(s) found.` : "\nNo approvals found (clean).");
}

main().catch((err) => {
  console.error("[security-check] fatal", err);
  process.exit(1);
});

