import { NextResponse } from "next/server";

import {
  SUPERVISION_AUTH_HEADER,
  SUPERVISION_REGISTER_PATH,
  WORKER_REGISTRATION_RULES,
} from "@/lib/studio-work-supervision/contract";
import { IngestValidationError, WorkerSelfCertifyError, parseRegisterBody } from "@/lib/studio-work-supervision/ingest";
import {
  getLiveSupervisionMachine,
  workerRegistrationContract,
} from "@/lib/studio-work-supervision/live-runtime";
import { authorizeSupervisionService } from "@/lib/studio-work-supervision/service-auth";

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
    const input = parseRegisterBody(body);
    const lease = getLiveSupervisionMachine().registerWorker(input);
    return NextResponse.json({
      ok: true,
      path: SUPERVISION_REGISTER_PATH,
      authHeader: SUPERVISION_AUTH_HEADER,
      rules: WORKER_REGISTRATION_RULES,
      contract: workerRegistrationContract(lease.leaseId),
      lease: {
        leaseId: lease.leaseId,
        kind: lease.kind,
        health: lease.health,
        assignedWorker: lease.assignedWorker,
        packageId: lease.packageId,
        branch: lease.branch,
        commit: lease.commit,
        customerId: lease.customerId,
        projectId: lease.projectId,
        campaignId: lease.campaignId,
        step: lease.step,
        issuedAt: lease.issuedAt,
        expectedCompletionAt: lease.expectedCompletionAt,
        expectedUpdateAt: lease.expectedUpdateAt,
        heartbeatIntervalMs: lease.heartbeatIntervalMs,
        graceMs: lease.graceMs,
        coverageConnected: lease.coverageConnected,
      },
    });
  } catch (error) {
    if (error instanceof WorkerSelfCertifyError || error instanceof IngestValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Registration failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
