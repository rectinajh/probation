import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
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
      signer?: string;
      signature?: string;
      message?: string;
    } | null;

    const provider = body?.provider;
    const description = body?.description;
    if (!provider || !description) {
      return NextResponse.json(
        { error: "provider and description are required" },
        { status: 400 },
      );
    }

    // Verify the connected wallet authorized this trial before we do anything.
    if (body?.signer && body?.signature && body?.message) {
      const ok = await verifyMessage({
        address: body.signer as `0x${string}`,
        message: body.message,
        signature: body.signature as `0x${string}`,
      });
      if (!ok) {
        return NextResponse.json(
          { error: "signature verification failed" },
          { status: 401 },
        );
      }
    }

    const budget = BigInt(body?.budget ?? "0");
    const result = await hireAgent({
      provider,
      description,
      budget,
      // In the demo the monitored position is the user's connected wallet.
      monitorAddress: body?.signer,
    });
    // jobId comes back as a BigInt from the SDK; serialize it as a string.
    return NextResponse.json({
      jobId: String(result.jobId),
      status: result.status,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
