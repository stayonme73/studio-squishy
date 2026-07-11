import type { ServiceId } from "@/catalog/types";
import type { ApprovedStudioPlan, CampaignRecord } from "@/config/studio-board";
import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import type { CampaignExceptionRecord, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { seedCustomerFieldTokensFromProjectDetails } from "@/lib/customer-field-tokens";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import { allocateSelectedServices, computeAdditionalCostUsd } from "@/studio-plan-review";

export const CERT_CLIENT: StudioUser = {
  id: "client-p3-cert",
  email: "client-p3-cert@example.com",
  displayName: "Client Cert",
  roles: ["client"],
};

export const CERT_OWNER: StudioUser = {
  id: "owner-p3-cert",
  email: "owner-p3-cert@studio.local",
  displayName: "Owner Cert",
  roles: ["owner"],
};

export const CERT_OTHER_CLIENT: StudioUser = {
  id: "other-p3-cert",
  email: "other-p3-cert@example.com",
  displayName: "Other Client",
  roles: ["client"],
};

export const CERT_ASSIGNMENTS: CampaignAssignmentsFile = {
  staffByUserId: {},
  staffCapabilities: {},
};

export const CERT_PLAN_SERVICES = ["v2-rtu-flyer", "v2-rtu-menu"] as const satisfies readonly ServiceId[];
export const CERT_REMOVE_SERVICE = "v2-rtu-menu" as ServiceId;
export const CERT_ADD_SERVICE = "sm-001" as ServiceId;

export function buildCertApprovedPlan(selectedServiceIds: readonly ServiceId[]): ApprovedStudioPlan {
  const { includedServiceIds, additionalServiceIds } = allocateSelectedServices(selectedServiceIds);
  const pricing = computePlanPricingTotals(selectedServiceIds);
  const { amountUsd } = computeAdditionalCostUsd(additionalServiceIds);
  return {
    selectedServiceIds: [...selectedServiceIds],
    includedServiceIds,
    additionalServiceIds,
    additionalCostUsd: amountUsd,
    oneTimeTotalCents: pricing.oneTimeSubtotalCents,
    monthlyTotalCents: pricing.monthlySubtotalCents,
    amountDueTodayCents: pricing.amountDueTodayCents,
    lineItems: buildServiceScopeSnapshot(selectedServiceIds),
    approvedAt: new Date().toISOString(),
    acknowledgmentVersion: "cert-v1",
    acknowledgmentText: "Certification acknowledgment",
    acknowledgedAt: "2026-07-01T12:00:00.000Z",
  };
}

export function buildCertCampaign(campaignId: string, overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  const now = new Date().toISOString();
  const base: CampaignRecord = {
    campaignId,
    campaignName: "Package 3 Certification",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Certification campaign",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    approvedStudioPlan: buildCertApprovedPlan(CERT_PLAN_SERVICES),
    projectDetails: {
      form: { ...EMPTY_PROJECT_DETAILS_FORM, primaryApproverEmail: "cert@example.com" },
      files: [],
      submittedAt: now,
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  return seedCustomerFieldTokensFromProjectDetails(base);
}

export function scopeException(
  campaignId: string,
  exceptionId: string,
  status: CampaignExceptionRecord["status"] = "waiting_owner",
): CampaignExceptionRecord {
  const now = new Date().toISOString();
  return {
    id: exceptionId,
    campaignId,
    kind: "scope_change",
    status,
    title: "Client scope request",
    createdAt: now,
    updatedAt: now,
    raisedByUserId: CERT_OWNER.id,
    raisedByDisplayName: "Owner Cert",
    raisedByRole: "owner",
  };
}

export function certTasksEnvelope(
  campaignId: string,
  exceptionId: string,
  status: CampaignExceptionRecord["status"] = "waiting_owner",
): ServerTasksEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId,
    tasks: [],
    planFingerprint: "cert-test",
    updatedAt: now,
    syncedAt: now,
    version: 9,
    exceptionRecords: [scopeException(campaignId, exceptionId, status)],
    exceptionEvents: [],
  };
}

export async function seedCertCampaign(campaignId: string, overrides: Partial<CampaignRecord> = {}) {
  const record = buildCertCampaign(campaignId, overrides);
  await upsertCampaignRecord(record, CERT_CLIENT.id);
  return record;
}

export function clonePlan(plan: ApprovedStudioPlan): ApprovedStudioPlan {
  return structuredClone(plan);
}
