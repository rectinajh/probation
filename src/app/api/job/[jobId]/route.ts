import { NextResponse } from "next/server";
import { readJob } from "@/lib/job-reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const id = Number(jobId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "invalid job id" }, { status: 400 });
    }
    const snapshot = await readJob(id);
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
