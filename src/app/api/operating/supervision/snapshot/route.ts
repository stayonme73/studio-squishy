import { NextResponse } from "next/server";

import { SUPERVISION_SNAPSHOT_PATH } from "@/lib/studio-work-supervision/contract";
import { getLiveSupervisionMachine } from "@/lib/studio-work-supervision/live-runtime";
import { getRuntimeSupervisionMachine } from "@/lib/studio-work-supervision/runtime";
import { authorizeSupervisionService } from "@/lib/studio-work-supervision/service-auth";
import { toIncidentCommandView } from "@/lib/studio-work-supervision/view-model";

export async function GET(request: Request) {
  const auth = authorizeSupervisionService(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const fixture = toIncidentCommandView(getRuntimeSupervisionMachine().snapshot());
  const live = toIncidentCommandView(getLiveSupervisionMachine().snapshot());
  return NextResponse.json({
    ok: true,
    path: SUPERVISION_SNAPSHOT_PATH,
    mixed: false,
    fixture,
    live,
  });
}
