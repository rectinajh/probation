import { createPublicClient, http, parseAbi } from "viem";
import { bscTestnet } from "viem/chains";

// Venus (Compound-fork) on BSC testnet. The testnet markets are seeded to
// mirror mainnet (realistic prices + rates), so reads look like production.
export const VENUS_COMPTROLLER =
  (process.env.VENUS_COMPTROLLER ??
    "0x94d1820b2D1c7c7452A163983Dc888CEC546b77D") as `0x${string}`;
export const VENUS_ORACLE =
  "0x3cD69251D04A28d887Ac14cbe2E14c52F3D57823" as `0x${string}`;
export const BNB_C_TOKEN = "0x2E7222e51c0f6e98610A1543Aa3836E092CDe62c" as `0x${string}`;
export const U_TOKEN = "0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565" as `0x${string}`;

// BSC (3s block time).
export const BLOCKS_PER_YEAR = 10_512_000n;

const comptrollerAbi = parseAbi([
  "function getAllMarkets() view returns (address[])",
  "function markets(address) view returns (bool,uint256,bool)",
]);
const marketAbi = parseAbi([
  "function supplyRatePerBlock() view returns (uint256)",
  "function borrowRatePerBlock() view returns (uint256)",
  "function underlying() view returns (address)",
  "function name() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function exchangeRateStored() view returns (uint256)",
]);
const oracleAbi = parseAbi([
  "function getUnderlyingPrice(address) view returns (uint256)",
]);
const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
]);

export interface Marketplace {
  cToken: `0x${string}`;
  name: string;
  underlying: `0x${string}`;
  /** 18-decimals normalized symbol (BNB for the native market). */
  symbol: string;
  supplyRatePerBlock: bigint;
  borrowRatePerBlock: bigint;
  /** Annualised supply / borrow rates as decimals (e.g. 0.0542 = 5.42%). */
  supplyApy: number;
  borrowApy: number;
}

export function client(rpcUrl?: string) {
  return createPublicClient({
    chain: bscTestnet,
    transport: http(
      rpcUrl ?? process.env.RPC_URL ?? "https://bsc-testnet-rpc.publicnode.com",
    ),
  });
}

/** (1 + r)^(blocksPerYear) - 1 from a per-block mantissa rate (18 decimals). */
export function annualised(perBlock: bigint): number {
  if (perBlock === 0n) return 0;
  const r = Number(perBlock) / 1e18;
  // For tiny per-block rates this is equivalent to r * blocksPerYear.
  return Math.pow(1 + r, Number(BLOCKS_PER_YEAR)) - 1;
}

export async function listMarkets(
  rpcUrl?: string,
): Promise<Marketplace[]> {
  const c = client(rpcUrl);
  const markets = (await c.readContract({
    address: VENUS_COMPTROLLER,
    abi: comptrollerAbi,
    functionName: "getAllMarkets",
  })) as `0x${string}`[];

  const out: Marketplace[] = [];
  const settled = await Promise.all(
    markets.map(async (cToken) => {
      try {
        const [name, underlying, supplyRate, borrowRate] =
          await Promise.all([
            c.readContract({ address: cToken, abi: marketAbi, functionName: "name" }),
            c.readContract({
              address: cToken,
              abi: marketAbi,
              functionName: "underlying",
            }),
            c.readContract({
              address: cToken,
              abi: marketAbi,
              functionName: "supplyRatePerBlock",
            }),
            c.readContract({
              address: cToken,
              abi: marketAbi,
              functionName: "borrowRatePerBlock",
            }),
          ]);
        const isNative =
          underlying === "0x0000000000000000000000000000000000000000";
        const symbol = isNative
          ? "BNB"
          : await c
              .readContract({
                address: underlying,
                abi: erc20Abi,
                functionName: "symbol",
              })
              .catch(() => "?");
        return {
          cToken,
          name,
          underlying,
          symbol,
          supplyRatePerBlock: supplyRate,
          borrowRatePerBlock: borrowRate,
          supplyApy: annualised(supplyRate),
          borrowApy: annualised(borrowRate),
        };
      } catch {
        return null; // Skip markets that cannot be fully read.
      }
    }),
  );
  for (const m of settled) if (m) out.push(m);
  return out;
}

/** Live BNB/USD price (18-decimal scale) from the Venus oracle on the cBNB market. */
export async function readBnbPriceUsd(rpcUrl?: string): Promise<number> {
  const c = client(rpcUrl);
  const raw = (await c.readContract({
    address: VENUS_ORACLE,
    abi: oracleAbi,
    functionName: "getUnderlyingPrice",
    args: [BNB_C_TOKEN],
  })) as bigint;
  return Number(raw) / 1e18;
}

/** User balances of BNB and the $U escrow stable, plus a live BNB price. */
export async function readUserBalances(
  account: `0x${string}`,
  rpcUrl?: string,
): Promise<{ bnb: bigint; u: bigint; bnbUsd: number; block: string }> {
  const c = client(rpcUrl);
  const [bnb, u, bnbUsd, block] = await Promise.all([
    c.getBalance({ address: account }),
    c.readContract({ address: U_TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [account] }),
    readBnbPriceUsd(rpcUrl),
    c.getBlockNumber(),
  ]);
  return { bnb, u, bnbUsd, block: block.toString() };
}
