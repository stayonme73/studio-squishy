/**
 * Deliverable scope resolver — frozen ApprovedStudioPlan.lineItems determine
 * customer-facing deliverable sections after payment.
 */

import { getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import { getPackageDeliverableQuotas } from "@/config/studio-guide";
import type {
  ApprovedStudioPlan,
  ApprovedStudioPlanLineItem,
  CampaignRecord,
} from "@/config/studio-board";

export type DeliverableSectionId =
  | "brand-direction-assets"
  | "brand-messaging"
  | "campaign-strategy-launch"
  | "campaign-strategy-monthly"
  | "social"
  | "email"
  | "sms"
  | "marketing-copy"
  | "written-content"
  | "video"
  | "audio"
  | "landing-page"
  | "optimization"
  | "marketing-assets"
  | "calendar";

export type DeliverableScopeSection = {
  sectionId: DeliverableSectionId | `fallback:${string}`;
  title: string;
  serviceIds: ServiceId[];
  deliverables: readonly string[];
};

export const DELIVERABLE_SECTION_TITLES: Record<DeliverableSectionId, string> = {
  "brand-direction-assets": "Brand Direction & Assets",
  "brand-messaging": "Brand Messaging",
  "campaign-strategy-launch": "Campaign Strategy & Launch Plan",
  "campaign-strategy-monthly": "Campaign Strategy & Monthly Support",
  social: "Social Content",
  email: "Email Content",
  sms: "SMS Content",
  "marketing-copy": "Marketing Copy",
  "written-content": "Written Content",
  video: "Video",
  audio: "Audio / Voice-Over",
  "landing-page": "Landing Page Content & Creative Direction",
  optimization: "Optimization Review",
  "marketing-assets": "Marketing Assets",
  calendar: "Marketing Calendar",
};

const EXECUTION_SKU_IDS = new Set<ServiceId>([
  "social_media-execution",
  "social_media-execution-monthly",
  "email_marketing-execution",
  "email_marketing-execution-monthly",
  "sms_marketing-execution",
  "sms_marketing-execution-monthly",
]);

const SKU_SECTION_MAP: Partial<Record<ServiceId, DeliverableSectionId>> = {
  "bf-001": "brand-direction-assets",
  "bf-002": "brand-messaging",
  "sm-001": "social",
  "sm-001-monthly": "social",
  "em-001": "email",
  "em-001-monthly": "email",
  "sms-001": "sms",
  "sms-001-monthly": "sms",
  "cc-001": "marketing-copy",
  "cc-001-monthly": "marketing-copy",
  "cc-002": "written-content",
  "cc-002-monthly": "written-content",
  "vp-001": "video",
  "vp-001-monthly": "video",
  "ap-001": "audio",
  "lp-001": "landing-page",
  "cp-001": "campaign-strategy-launch",
  "cp-001-monthly": "campaign-strategy-monthly",
  "mo-001": "optimization",
  "mo-001-monthly": "optimization",
  "ma-001": "marketing-assets",
  "ma-001-monthly": "marketing-assets",
};

const SERVICE_NAME_SECTION_MAP: Record<string, DeliverableSectionId> = {
  "Brand Identity Refresh": "brand-direction-assets",
  "Brand Messaging": "brand-messaging",
  "Campaign Launch Kit": "campaign-strategy-launch",
  "Monthly Campaign Support": "campaign-strategy-monthly",
  "Social Media Launch Set": "social",
  "Monthly Social Media Content Support": "social",
  "Email Campaign Build": "email",
  "Monthly Email Content Support": "email",
  "SMS Campaign Build": "sms",
  "Monthly SMS Content Support": "sms",
  "Marketing Copywriting Project": "marketing-copy",
  "Monthly Copy Support": "marketing-copy",
  "Content Writing Project": "written-content",
  "Monthly Content Writing Support": "written-content",
  "Marketing Video Project": "video",
  "Monthly Video Content Support": "video",
  "AI Voice Over Production": "audio",
  "Landing Page Content & Creative Direction": "landing-page",
  "Marketing Optimization Review": "optimization",
  "Monthly Marketing Optimization Support": "optimization",
  "Promotion Pack": "marketing-assets",
  "Monthly Marketing Asset Support": "marketing-assets",
};

export const DELIVERABLE_SECTION_ORDER: readonly DeliverableSectionId[] = [
  "brand-direction-assets",
  "brand-messaging",
  "campaign-strategy-launch",
  "campaign-strategy-monthly",
  "social",
  "email",
  "sms",
  "marketing-copy",
  "written-content",
  "video",
  "audio",
  "landing-page",
  "optimization",
  "marketing-assets",
  "calendar",
];

const LEGACY_QUOTA_SECTION_MAP: Partial<Record<string, DeliverableSectionId>> = {
  social: "social",
  emails: "email",
  sms: "sms",
  video: "video",
  calendar: "calendar",
};

const CHANNEL_SECTION_IDS = new Set<DeliverableSectionId>(["social", "email", "sms"]);

function lineSkuId(line: ApprovedStudioPlanLineItem): ServiceId {
  return (line.skuId ?? line.serviceId!) as ServiceId;
}

function isExecutionLineItem(line: ApprovedStudioPlanLineItem): boolean {
  const skuId = lineSkuId(line);
  if (EXECUTION_SKU_IDS.has(skuId)) return true;
  return Boolean(getServiceById(skuId)?.isExecutionAddOn);
}

function resolveSectionForLineItem(
  line: ApprovedStudioPlanLineItem,
): DeliverableScopeSection | null {
  if (isExecutionLineItem(line)) return null;

  const skuId = lineSkuId(line);
  const serviceName = line.serviceName ?? line.name ?? skuId;
  const mapped =
    SKU_SECTION_MAP[skuId] ??
    SERVICE_NAME_SECTION_MAP[serviceName] ??
    null;

  if (mapped) {
    return {
      sectionId: mapped,
      title: DELIVERABLE_SECTION_TITLES[mapped],
      serviceIds: [skuId],
      deliverables: [...line.deliverables],
    };
  }

  return {
    sectionId: `fallback:${skuId}`,
    title: serviceName,
    serviceIds: [skuId],
    deliverables: [...line.deliverables],
  };
}

function mergeScopeSections(sections: DeliverableScopeSection[]): DeliverableScopeSection[] {
  const byKey = new Map<string, DeliverableScopeSection>();

  for (const section of sections) {
    const existing = byKey.get(section.sectionId);
    if (!existing) {
      byKey.set(section.sectionId, {
        ...section,
        serviceIds: [...section.serviceIds],
        deliverables: [...section.deliverables],
      });
      continue;
    }
    existing.serviceIds.push(...section.serviceIds);
    existing.deliverables = [...existing.deliverables, ...section.deliverables];
  }

  const orderedKnown: DeliverableScopeSection[] = [];
  for (const sectionId of DELIVERABLE_SECTION_ORDER) {
    const match = byKey.get(sectionId);
    if (match) orderedKnown.push(match);
  }

  const fallbacks = [...byKey.entries()]
    .filter(([id]) => id.startsWith("fallback:"))
    .map(([, section]) => section);

  return [...orderedKnown, ...fallbacks];
}

/** Resolve deliverable sections from frozen approved plan line items. */
export function resolveDeliverableScopeFromPlan(
  plan: ApprovedStudioPlan,
): DeliverableScopeSection[] {
  const raw = plan.lineItems
    .map(resolveSectionForLineItem)
    .filter((section): section is DeliverableScopeSection => section !== null);
  return mergeScopeSections(raw);
}

/** Legacy package quotas — only when no frozen approved plan line items exist. */
export function resolveLegacyDeliverableScope(
  campaign: CampaignRecord,
): DeliverableScopeSection[] {
  const quotas = getPackageDeliverableQuotas(campaign.packageId);
  const sections: DeliverableScopeSection[] = [];

  for (const quota of quotas) {
    const sectionId = LEGACY_QUOTA_SECTION_MAP[quota.id];
    if (!sectionId) continue;
    sections.push({
      sectionId,
      title: DELIVERABLE_SECTION_TITLES[sectionId],
      serviceIds: [],
      deliverables: [`${quota.label} (${quota.total} included in ${campaign.packageLabel})`],
    });
  }

  return mergeScopeSections(sections);
}

/** Primary entry — frozen plan first, legacy package quotas as fallback. */
export function resolveDeliverableScopeFromCampaign(
  campaign: CampaignRecord,
): DeliverableScopeSection[] {
  const lineItems = campaign.approvedStudioPlan?.lineItems;
  if (lineItems?.length) {
    return resolveDeliverableScopeFromPlan(campaign.approvedStudioPlan!);
  }
  return resolveLegacyDeliverableScope(campaign);
}

export function scopeIncludesSection(
  scope: readonly DeliverableScopeSection[],
  sectionId: DeliverableSectionId,
): boolean {
  return scope.some((section) => section.sectionId === sectionId);
}

export function scopeHasChannelSections(scope: readonly DeliverableScopeSection[]) {
  return {
    social: scopeIncludesSection(scope, "social"),
    email: scopeIncludesSection(scope, "email"),
    sms: scopeIncludesSection(scope, "sms"),
  };
}

export type ReviewSectionId =
  | DeliverableSectionId
  | "hero"
  | "rationale"
  | `fallback:${string}`;

/** Review Room section order — hero + rationale always; channels only when purchased. */
export function resolveReviewSectionIds(
  scope: readonly DeliverableScopeSection[],
): ReviewSectionId[] {
  const scopeIds = scope.map((section) => section.sectionId);
  const nonChannel = scopeIds.filter(
    (id) => !CHANNEL_SECTION_IDS.has(id as DeliverableSectionId) && id !== "calendar",
  );
  const channels = (["social", "email", "sms"] as const).filter((id) =>
    scopeIds.includes(id),
  );
  return ["hero", ...nonChannel, ...channels, "rationale"];
}

export function resolveReviewSectionLabels(
  scope: readonly DeliverableScopeSection[],
): Record<string, string> {
  const labels: Record<string, string> = {
    hero: "Hero",
    rationale: "Why this direction",
  };

  for (const section of scope) {
    if (section.sectionId === "social") labels.social = "Social post";
    else if (section.sectionId === "email") labels.email = "Email";
    else if (section.sectionId === "sms") labels.sms = "SMS";
    else labels[section.sectionId] = section.title;
  }

  return labels;
}

export function resolvePickerScopeChips(scope: readonly DeliverableScopeSection[]): string[] {
  const chips: string[] = [];
  for (const section of scope) {
    if (section.sectionId === "social") chips.push("Social");
    else if (section.sectionId === "email") chips.push("Email");
    else if (section.sectionId === "sms") chips.push("SMS");
    else if (section.sectionId !== "calendar") chips.push(section.title);
  }
  return chips;
}
