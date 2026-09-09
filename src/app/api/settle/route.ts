import { NextResponse } from "next/server";
import { settleJob } from "@/lib/job-reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      jobId?: number | string;
    } | null;
    const jobId = Number(body?.jobId);
    if (!Number.isInteger(jobId) || jobId <= 0) {
      return NextResponse.json({ error: "invalid job id" }, { status: 400 });
    }
    const status = await settleJob(jobId);
    return NextResponse.json({ jobId, status });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
