import { NextResponse } from "next/server";
import { hireAgent } from "@/lib/erc8183";

export const runtime = "nodejs";

/**
 * Buyer-side hire: create + register + fund an ERC-8183 job.
 *
 * NOTE (demo): this uses the server wallet (PRIVATE_KEY) as the buyer, which is
 * only valid for a self-hire demo. In production the buyer is the user's own
 * wallet (wagmi) signing the createJob/fund calls.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      provider?: string;
      description?: string;
      budget?: string;
    } | null;

    const provider = body?.provider;
    const description = body?.description;
    if (!provider || !description) {
      return NextResponse.json(
        { error: "provider and description are required" },
        { status: 400 },
      );
    }

    const budget = BigInt(body?.budget ?? "0");
    const result = await hireAgent({ provider, description, budget });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

