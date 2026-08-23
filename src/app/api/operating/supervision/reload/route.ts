import { NextResponse } from "next/server";

import { SUPERVISION_RELOAD_PATH } from "@/lib/studio-work-supervision/contract";
import { authorizeSupervisionService } from "@/lib/studio-work-supervision/service-auth";
import { reloadLiveSupervisionMachineFromDisk } from "@/lib/studio-work-supervision/live-runtime";

export async function POST(request: Request) {
  const auth = authorizeSupervisionService(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const machine = await reloadLiveSupervisionMachineFromDisk();
  const snapshot = machine.snapshot();
  return NextResponse.json({
    ok: true,
    path: SUPERVISION_RELOAD_PATH,
    reloaded: true,
    recordSource: snapshot.recordSource,
    leaseCount: snapshot.leases.length,
    incidentCount: snapshot.incidents.length,
    leases: snapshot.leases.map((lease) => ({
      leaseId: lease.leaseId,
      health: lease.health,
      lastHealthyAt: lease.lastHealthyAt,
      lastHeartbeatAt: lease.lastHeartbeatAt,
      reportedStatus: lease.reportedStatus,
      serviceNeedsHealthCheck: lease.serviceNeedsHealthCheck,
    })),
    incidents: snapshot.incidents.map((incident) => ({
      incidentId: incident.incidentId,
      leaseId: incident.leaseId,
      customerId: incident.customerId,
      state: incident.state,
      ownerEscalated: incident.ownerEscalated,
      nextCheckAt: incident.nextCheckAt,
      recoveryAttempts: incident.recoveryAttempts,
      historyLength: incident.history.length,
    })),
  });
}
