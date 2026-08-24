import { NextResponse } from "next/server";

import { authorizeSupervisionService } from "@/lib/studio-work-supervision/service-auth";
import { getLiveSupervisionMachine } from "@/lib/studio-work-supervision/live-runtime";
import { toSanitizedSweepJson } from "@/lib/studio-work-supervision/run-sweep-once";

export async function POST(request: Request) {
  const auth = authorizeSupervisionService(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const machine = await getLiveSupervisionMachine();
  const sweep = await Promise.resolve(machine.sweep());
  return NextResponse.json(toSanitizedSweepJson(machine, sweep));
}
