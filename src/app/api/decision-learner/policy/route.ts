import { NextResponse } from "next/server";

import { getPolicy, setPolicy } from "@/lib/decision-learner/store";

export async function GET() {
  const policy = await getPolicy();
  return NextResponse.json({ policy });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { policy?: string };
  if (typeof body.policy !== "string") {
    return NextResponse.json(
      { error: "policy must be a string" },
      { status: 400 },
    );
  }
  await setPolicy(body.policy);
  return NextResponse.json({ ok: true });
}
