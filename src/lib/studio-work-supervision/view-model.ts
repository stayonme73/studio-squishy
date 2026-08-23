import { isSecuritySeverity, mayShowSquishy, SQUISHY_WATCHKEEPER_PUBLIC_PATH } from "./policy";
import type { HealthStatus, MachineIncident, SupervisionSnapshot, WorkLease } from "./types";

export const INCIDENT_COMMAND_ROUTE = "/file-room/incident-command";

export type IncidentCommandCard = {
  incidentId: string;
  customerLabel: string;
  projectId: string;
  campaignId: string;
  severity: MachineIncident["severity"];
  state: MachineIncident["state"];
  whatHappened: string;
  whoOrWhatStalled: string;
  ownerEscalated: boolean;
  showSquishy: boolean;
  href: string;
};

export type IncidentCommandDetail = {
  incident: MachineIncident;
  showSquishy: boolean;
  presentation: "routine" | "serious" | "critical";
  whatHappened: string;
  whoOrWhatStalled: string;
  evidenceSupportedCause: string;
  ownerControlsAuthorized: boolean;
};

export type IncidentCommandView = {
  title: string;
  lead: string;
  watchkeeper: {
    showSquishy: boolean;
    assetSrc: string;
    ring: "green" | "yellow" | "orange" | "red" | "hidden";
    caption: string;
  };
  providers: SupervisionSnapshot["providers"];
  healthyLeases: WorkLease[];
  incidentCards: IncidentCommandCard[];
};

export function incidentCommandHref(incidentId: string): string {
  return `${INCIDENT_COMMAND_ROUTE}/${encodeURIComponent(incidentId)}`;
}

export function toIncidentCommandView(snapshot: SupervisionSnapshot): IncidentCommandView {
  const securityOpen = snapshot.incidents.some(
    (incident) => incident.state !== "RESOLVED" && isSecuritySeverity(incident.severity),
  );
  const escalatedOpen = snapshot.incidents.some(
    (incident) => incident.ownerEscalated && incident.state !== "RESOLVED",
  );
  const stalled = snapshot.leases.some((lease) => lease.health === "STALLED");
  const ring: IncidentCommandView["watchkeeper"]["ring"] = securityOpen
    ? "hidden"
    : stalled || escalatedOpen
      ? "red"
      : snapshot.leases.some((lease) => lease.health === "BLOCKED")
        ? "orange"
        : snapshot.leases.some((lease) => lease.health === "WAITING")
          ? "yellow"
          : "green";

  return {
    title: "Incident Command",
    lead: "Machine-owned supervision. The decision desk is unchanged. This board is the incident command view.",
    watchkeeper: {
      showSquishy: !securityOpen,
      assetSrc: SQUISHY_WATCHKEEPER_PUBLIC_PATH,
      ring,
      caption: securityOpen
        ? "Security path is active. Watchkeeper is hidden. Use the critical records below."
        : "Routine internal Watchkeeper. This is not Studio Voice and is not shown to customers.",
    },
    providers: snapshot.providers,
    healthyLeases: snapshot.leases.filter(
      (lease) =>
        !lease.mismatch &&
        (lease.health === "ACTIVE" ||
          lease.health === "SERVICE_AWAKE" ||
          lease.health === "COMPLETE"),
    ),
    incidentCards: snapshot.incidents.map((incident) => ({
      incidentId: incident.incidentId,
      customerLabel: incident.customerLabel,
      projectId: incident.projectId,
      campaignId: incident.campaignId,
      severity: incident.severity,
      state: incident.state,
      whatHappened: incident.customerImpact,
      whoOrWhatStalled: `${incident.responsibleComponent.label} — ${incident.failedOrStalledStep}`,
      ownerEscalated: incident.ownerEscalated,
      showSquishy: mayShowSquishy(incident.severity),
      href: incidentCommandHref(incident.incidentId),
    })),
  };
}

export function toIncidentCommandDetail(incident: MachineIncident): IncidentCommandDetail {
  const security = isSecuritySeverity(incident.severity);
  return {
    incident,
    showSquishy: mayShowSquishy(incident.severity),
    presentation: security ? "critical" : incident.ownerEscalated ? "serious" : "routine",
    whatHappened: incident.customerImpact,
    whoOrWhatStalled: `${incident.responsibleComponent.label} stalled at ${incident.failedOrStalledStep}.`,
    evidenceSupportedCause:
      incident.evidence.length > 0
        ? incident.evidence.map((item) => item.summary).join(" ")
        : "Cause is recorded only as far as evidence supports. No extra blame is attached.",
    ownerControlsAuthorized: incident.ownerEscalated && incident.state !== "RESOLVED",
  };
}

export function unusedHealthRing(health: HealthStatus): "green" | "yellow" | "orange" | "red" {
  if (health === "ACTIVE" || health === "SERVICE_AWAKE" || health === "COMPLETE") return "green";
  if (health === "WAITING") return "yellow";
  if (health === "BLOCKED") return "orange";
  return "red";
}
