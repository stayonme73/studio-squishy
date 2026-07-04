import type { StudioGuidePackageId } from "@/config/studio-guide";
import {
  legacyRouteQuarantineV1,
  ROUTE_MAP_HREF,
  ROUTE_MAP_INTAKE_STEP_HREF,
} from "@/config/legacy-route-quarantine-v1";
import type { CampaignPackageId, CampaignRecord, CampaignStatus } from "@/config/studio-board";
import { readCurrentCampaignHydrated } from "@/lib/studio-board-campaign";

/** Post-payment Route Map intake — opens service-specific materials form in Route Map scene. */
export const ROUTE_MAP_INTAKE_HREF = ROUTE_MAP_INTAKE_STEP_HREF;
export { ROUTE_MAP_HREF, ROUTE_MAP_INTAKE_STEP_HREF };

/** Statuses where customers may review and edit intake answers. */
export const INTAKE_EDITABLE_STATUSES = ["DRAFT_RECEIVED", "PAYMENT_RECEIVED"] as const satisfies readonly CampaignStatus[];

export type IntakeEditableStatus = (typeof INTAKE_EDITABLE_STATUSES)[number];

export function isIntakeEditable(status: CampaignStatus | null | undefined): status is IntakeEditableStatus {
  if (!status) return false;
  return (INTAKE_EDITABLE_STATUSES as readonly string[]).includes(status);
}

export function isRouteMapCampaign(campaign: CampaignRecord | null | undefined): boolean {
  return Boolean(campaign?.routeMapContext?.jobId);
}

export function routeMapIntakeHref(): string {
  return ROUTE_MAP_INTAKE_HREF;
}

/** Intake edit / post-payment handoff — Route Map jobs stay on Route Map intake. */
export function resolveIntakeEditHref(
  campaign: CampaignRecord | null | undefined,
  _packageId?: CampaignPackageId,
): string {
  if (isRouteMapCampaign(campaign)) return routeMapIntakeHref();
  return legacyRouteQuarantineV1.activeIntake;
}

export function draftRoomEditHref(
  packageId?: CampaignPackageId,
  campaign?: CampaignRecord | null,
): string {
  return resolveIntakeEditHref(campaign ?? readCurrentCampaignHydrated(), packageId);
}

export function projectDetailsEditHref(
  packageId?: CampaignPackageId,
  campaign?: CampaignRecord | null,
): string {
  return resolveIntakeEditHref(campaign ?? readCurrentCampaignHydrated(), packageId);
}

/** Default Secure Checkout navigation when no onPaymentComplete handler is provided. */
export function resolvePostPaymentIntakeHref(
  campaign: CampaignRecord | null | undefined,
  packageId?: StudioGuidePackageId,
): string {
  return resolveIntakeEditHref(campaign, packageId);
}
