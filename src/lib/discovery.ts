const BASE_URL = "https://api.8004scan.io/api/v1";

/**
 * Discover ERC-8004 agents via the 8004scan developer API. The key is backend
 * only and is sent as `X-API-Key`. The exact response shape should be verified
 * against the live API before rendering.
 */
export async function listAgents(query?: string): Promise<unknown> {
  const url = query
    ? `${BASE_URL}/agents/search/semantic?q=${encodeURIComponent(query)}`
    : `${BASE_URL}/agents`;

  const key = process.env.SCAN_8004_API_KEY ?? "";
  const res = await fetch(url, {
    headers: {
      ...(key ? { "X-API-Key": key } : {}),
      accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`8004scan ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

