import { NextResponse } from "next/server";

import { deleteCase, updateCase } from "@/lib/decision-learner/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
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

  const updated = await updateCase(id, {
    situation: body.situation,
    decision: body.decision,
    rationale: body.rationale,
  });

  if (!updated) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  return NextResponse.json({ case: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const removed = await deleteCase(id);
  if (!removed) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
