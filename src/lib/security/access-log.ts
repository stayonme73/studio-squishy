import type { StudioUser } from "@/lib/campaign-store/types";

export type AccessEventKind =
  | "auth_required"
  | "access_denied"
  | "campaign_claim_denied"
  | "staff_route_denied";

export type AccessEvent = {
  kind: AccessEventKind;
  route: string;
  user?: StudioUser | null;
  campaignId?: string;
  jobId?: string;
  reason?: string;
};

export function logAccessEvent(event: AccessEvent): void {
  const safeUser = event.user
    ? {
        id: event.user.id,
        roles: event.user.roles,
      }
    : null;

  console.warn("[access-control]", {
    kind: event.kind,
    route: event.route,
    user: safeUser,
    campaignId: event.campaignId,
    jobId: event.jobId,
    reason: event.reason,
  });
}
