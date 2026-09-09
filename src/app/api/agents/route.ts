import { NextResponse } from "next/server";
import { searchAgentsByCategory } from "@/lib/discovery";
import type { Category } from "@/lib/domain";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") as Category | null;
    const valid: Category[] = [
      "rebalancing",
      "grid-trading",
      "yield-optimisation",
      "health-factor-monitoring",
    ];
    if (!category || !valid.includes(category)) {
      return NextResponse.json(
        { error: "invalid category" },
        { status: 400 },
      );
    }
    const agents = await searchAgentsByCategory(category);
    return NextResponse.json({ category, agents });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
