import { NextResponse } from "next/server";

import { SUPERVISION_SWEEP_PATH } from "@/lib/studio-work-supervision/contract";
import { getLiveSupervisionMachine } from "@/lib/studio-work-supervision/live-runtime";
import { authorizeSupervisionService } from "@/lib/studio-work-supervision/service-auth";

export async function POST(request: Request) {
  const auth = authorizeSupervisionService(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const machine = getLiveSupervisionMachine();
  const sweep = machine.sweep();
  const snapshot = machine.snapshot();
  return NextResponse.json({
    ok: true,
    path: SUPERVISION_SWEEP_PATH,
    machineComputesHealth: true,
    providersRemainUnconnected: snapshot.providers.map((port) => ({
      id: port.id,
      status: port.status,
      healthyDisplayAllowed: port.healthyDisplayAllowed,
    })),
    sweep,
    incidents: snapshot.incidents.map((incident) => ({
      incidentId: incident.incidentId,
      customerId: incident.customerId,
      customerLabel: incident.customerLabel,
      projectId: incident.projectId,
      campaignId: incident.campaignId,
      severity: incident.severity,
      category: incident.category,
      state: incident.state,
      ownerEscalated: incident.ownerEscalated,
      failedOrStalledStep: incident.failedOrStalledStep,
      customerImpact: incident.customerImpact,
      deadlineImpact: incident.deadlineImpact,
      financialImpact: incident.financialImpact,
      rightsOrComplianceImpact: incident.rightsOrComplianceImpact,
      securityOrBreachImpact: incident.securityOrBreachImpact,
      containmentPerformed: incident.containmentPerformed,
      currentResponsibleParty: incident.currentResponsibleParty,
      whoMustBeContacted: incident.whoMustBeContacted,
      lastHealthyAt: incident.lastHealthyAt,
      lastHeartbeatAt: incident.lastHeartbeatAt,
      recoveryAttempts: incident.recoveryAttempts,
      ownerDecisionRequired: incident.ownerDecisionRequired,
      nextAutomaticAction: incident.nextAutomaticAction,
      ifOwnerDoesNothing: incident.ifOwnerDoesNothing,
      nextCheckAt: incident.nextCheckAt,
      evidence: incident.evidence,
      history: incident.history,
    })),
  });
}
