import { NextResponse } from "next/server";

import { runAnthropicActivationProbe } from "@/lib/studio-production-team-workforce/anthropic-activation-probe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Development-only: prove Design/Copy Anthropic in the running Next process. */
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await runAnthropicActivationProbe();
  const serialized = JSON.stringify(result);
  if (/sk-ant-/i.test(serialized)) {
    return NextResponse.json(
      { error: "Probe refused to return a secret-shaped payload." },
      { status: 500 },
    );
  }
  return NextResponse.json(result);
}
