import { NextResponse } from "next/server";
import { listAgents } from "@/lib/discovery";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get("q") ?? undefined;
    const agents = await listAgents(q);
    return NextResponse.json({ agents });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

