import { NextResponse } from "next/server";

import { SUPERVISION_HEARTBEAT_PATH, SUPERVISION_IDEMPOTENCY_HEADER } from "@/lib/studio-work-supervision/contract";
import {
  IngestValidationError,
  WorkerSelfCertifyError,
  parseHeartbeatBody,
} from "@/lib/studio-work-supervision/ingest";
import { getLiveSupervisionMachine } from "@/lib/studio-work-supervision/live-runtime";
import { authorizeSupervisionService } from "@/lib/studio-work-supervision/service-auth";
import { SupervisionIsolationError, UnknownLeaseError } from "@/lib/studio-work-supervision/types";

export async function POST(request: Request) {
  const auth = authorizeSupervisionService(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const input = parseHeartbeatBody(
      body,
      request.headers.get(SUPERVISION_IDEMPOTENCY_HEADER),
    );
    const result = await getLiveSupervisionMachine().then((machine) =>
      Promise.resolve(machine.recordHeartbeat(input)),
    );
    return NextResponse.json({
      ok: true,
      path: SUPERVISION_HEARTBEAT_PATH,
      ignored: result.ignored,
      machineComputedHealth: result.lease.health,
      reportedStatus: result.lease.reportedStatus,
      lease: {
        leaseId: result.lease.leaseId,
        kind: result.lease.kind,
        health: result.lease.health,
        customerId: result.lease.customerId,
        projectId: result.lease.projectId,
        lastHeartbeatAt: result.lease.lastHeartbeatAt,
        lastHealthyAt: result.lease.lastHealthyAt,
        expectedUpdateAt: result.lease.expectedUpdateAt,
        mismatch: result.lease.mismatch,
        waitingReason: result.lease.waitingReason,
        blocker: result.lease.blocker,
        completedAt: result.lease.completedAt,
        coverageConnected: result.lease.coverageConnected,
      },
    });
  } catch (error) {
    if (error instanceof WorkerSelfCertifyError || error instanceof IngestValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SupervisionIsolationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 403 });
    }
    if (error instanceof UnknownLeaseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Heartbeat failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
