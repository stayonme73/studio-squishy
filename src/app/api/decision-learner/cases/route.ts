import { NextResponse } from "next/server";

import { createCase, listCases } from "@/lib/decision-learner/store";

export async function GET() {
  const cases = await listCases();
  return NextResponse.json({ cases });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    situation?: string;
    decision?: string;
    rationale?: string;
  };

  if (!body.situation?.trim() || !body.decision?.trim() || !body.rationale?.trim()) {
    return NextResponse.json(
      { error: "situation, decision, and rationale are required" },
      { status: 400 },
    );
  }

  const entry = await createCase({
    situation: body.situation,
    decision: body.decision,
    rationale: body.rationale,
    source: "manual",
  });

  return NextResponse.json({ case: entry }, { status: 201 });
}
