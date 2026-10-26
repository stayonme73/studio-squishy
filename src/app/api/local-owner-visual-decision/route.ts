import { writeFileSync } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";

const DECISION_PATH = path.join(
  process.cwd(),
  "docs/launch/studio-operating-visual-system-freeze-1/OWNER-VISUAL-ACCEPTANCE-DECISION.json",
);

export async function POST(request: Request) {
  if (!isLocalAuthFixtureAvailable()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { decision?: string; at?: string } = {};
  try {
    body = (await request.json()) as { decision?: string; at?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const decision = body.decision === "accepted" || body.decision === "refused"
    ? body.decision
    : null;
  if (!decision) {
    return NextResponse.json({ error: "decision must be accepted or refused" }, { status: 400 });
  }

  const record = {
    schemaVersion: 1,
    pass: "five-screen-shared-glass",
    decision,
    decidedAt: body.at ?? new Date().toISOString(),
    screens: [
      "project-record",
      "review-room",
      "studio-board",
      "payment",
      "intake",
    ],
    doNotResumeMobileAutomatically: true,
    doNotMerge: true,
    doNotPush: true,
  };
  writeFileSync(DECISION_PATH, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return NextResponse.json(
    { ok: true, decision },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
}

export async function OPTIONS() {
  if (!isLocalAuthFixtureAvailable()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
