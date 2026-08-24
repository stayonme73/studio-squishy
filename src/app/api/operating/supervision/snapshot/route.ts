import { NextResponse } from "next/server";

import { SUPERVISION_SNAPSHOT_PATH } from "@/lib/studio-work-supervision/contract";
import { readLiveSupervisionForIncidentCommand } from "@/lib/studio-work-supervision/live-read";
import {
  peekLiveSupervisionMachine,
} from "@/lib/studio-work-supervision/live-runtime";
import { isLaunchRuntime } from "@/lib/studio-work-supervision/provider-class";
import { getRuntimeSupervisionMachine } from "@/lib/studio-work-supervision/runtime";
import { authorizeSupervisionService } from "@/lib/studio-work-supervision/service-auth";
import { toIncidentCommandView } from "@/lib/studio-work-supervision/view-model";

export async function GET(request: Request) {
  const auth = authorizeSupervisionService(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const fixture = toIncidentCommandView(getRuntimeSupervisionMachine().snapshot());

  if (!isLaunchRuntime()) {
    const existing = peekLiveSupervisionMachine();
    if (existing) {
      return NextResponse.json({
        ok: true,
        path: SUPERVISION_SNAPSHOT_PATH,
        mixed: false,
        fixture,
        live: toIncidentCommandView(existing.snapshot()),
      });
    }
  }

  const liveRead = await readLiveSupervisionForIncidentCommand();
  if (!liveRead.ok) {
    return NextResponse.json(
      {
        ok: false,
        path: SUPERVISION_SNAPSHOT_PATH,
        mixed: false,
        fixture,
        stage: liveRead.stage,
        errorClass: liveRead.errorClass,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    path: SUPERVISION_SNAPSHOT_PATH,
    mixed: false,
    fixture,
    live: toIncidentCommandView(liveRead.snapshot),
    schemaVersion: liveRead.schemaVersion,
  });
}
