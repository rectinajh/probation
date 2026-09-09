import { NextResponse } from "next/server";
import { getDeliverable } from "@/lib/deliverable-store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const evidence = getDeliverable(jobId);
  if (!evidence) {
    return NextResponse.json(
      { error: "deliverable not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ jobId, evidence });
}

