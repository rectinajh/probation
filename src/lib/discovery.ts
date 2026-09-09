import type { Category } from "./domain";

const BASE_URL = "https://api.8004scan.io/api/v1";

/** A real ERC-8004 agent as returned by the 8004scan discovery API. */
export interface Agent {
  id: string;
  agentId: string;
  tokenId: string;
  chainId: number;
  contractAddress: string;
  isTestnet: boolean;
  ownerAddress: string;
  ownerName: string | null;
  name: string;
  description: string;
  imageUrl: string | null;
  isVerified: boolean;
  starCount: number;
  supportedProtocols: string[];
  x402Supported: boolean;
  totalScore: number;
  totalFeedbacks: number;
  averageScore: number;
  healthScore: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Map each PROBATION category to a real 8004scan semantic-search query. */
const CATEGORY_QUERY: Record<Category, string> = {
  "health-factor-monitoring": "lending health factor monitoring",
  rebalancing: "portfolio rebalancing defi",
  "grid-trading": "grid trading bot",
  "yield-optimisation": "yield optimisation vault",
};

function mapItem(raw: Record<string, unknown>): Agent {
  return {
    id: String(raw.id ?? ""),
    agentId: String(raw.agent_id ?? ""),
    tokenId: String(raw.token_id ?? ""),
    chainId: Number(raw.chain_id ?? 0),
    contractAddress: String(raw.contract_address ?? ""),
    isTestnet: Boolean(raw.is_testnet),
    ownerAddress: String(raw.owner_address ?? ""),
    ownerName: (raw.owner_username as string | null) ?? null,
    name: String(raw.name ?? "Unnamed agent"),
    description: String(raw.description ?? ""),
    imageUrl: (raw.image_url as string | null) ?? null,
    isVerified: Boolean(raw.is_verified),
    starCount: Number(raw.star_count ?? 0),
    supportedProtocols: Array.isArray(raw.supported_protocols)
      ? (raw.supported_protocols as string[])
      : [],
    x402Supported: Boolean(raw.x402_supported),
    totalScore: Number(raw.total_score ?? 0),
    totalFeedbacks: Number(raw.total_feedbacks ?? 0),
    averageScore: Number(raw.average_score ?? 0),
    healthScore:
      raw.health_score === null || raw.health_score === undefined
        ? null
        : Number(raw.health_score),
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
  };
}

async function request<T>(path: string): Promise<T> {
  const key = process.env.SCAN_8004_API_KEY ?? "";
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      ...(key ? { "X-API-Key": key } : {}),
      accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`8004scan ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Semantic search for real agents relevant to a trial category. */
export async function searchAgentsByCategory(
  category: Category,
  limit = 8,
): Promise<Agent[]> {
  const q = CATEGORY_QUERY[category];
  const data = await request<{ items?: Record<string, unknown>[] }>(
    `/agents/search/semantic?q=${encodeURIComponent(q)}&limit=${limit}`,
  );
  const agents = (data.items ?? []).map(mapItem);
  // Prefer BSC-native agents (mainnet 56 / testnet 97) so the marketplace feels
  // on-theme; fall back to cross-chain matches only if BSC returns nothing.
  const isBsc = (a: Agent) => a.chainId === 56 || a.chainId === 97;
  const bsc = agents.filter(isBsc);
  const pool = (bsc.length >= 4 ? bsc : agents).sort(
    (a, b) => b.totalScore - a.totalScore,
  );
  return pool.slice(0, limit);
}

/** List recent agents (fallback / generic browse). */
export async function listRawAgents(limit = 20): Promise<Agent[]> {
  const data = await request<{ items?: Record<string, unknown>[] }>(
    `/agents?limit=${limit}`,
  );
  return (data.items ?? []).map(mapItem);
}
