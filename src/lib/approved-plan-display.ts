import { getServiceById } from "@/catalog/accessors";
import { SERVICE_CATEGORIES } from "@/catalog/categories";
import type { ServiceId } from "@/catalog/types";
import {
  studioBoard,
  CUSTOM_STUDIO_PLAN_PACKAGE_ID,
  type ApprovedStudioPlan,
  type ApprovedStudioPlanLineItem,
  type CampaignRecord,
  type CustomStudioPlanPackageId,
} from "@/config/studio-board";
import { getPackageIncludes, getPackageRevisionRounds, type StudioGuidePackageId } from "@/config/studio-guide";
import { formatUsdFromCents } from "@/lib/plan-pricing";

export const CUSTOM_STUDIO_PLAN_LABEL = "Custom Studio Plan";

export { CUSTOM_STUDIO_PLAN_PACKAGE_ID };
export type { CustomStudioPlanPackageId };

export function isCustomStudioPlanPackageId(
  packageId: string | undefined,
): packageId is CustomStudioPlanPackageId {
  return packageId === CUSTOM_STUDIO_PLAN_PACKAGE_ID;
}

export function campaignUsesCustomStudioPlan(campaign: CampaignRecord): boolean {
  return Boolean(campaign.approvedStudioPlan) || isCustomStudioPlanPackageId(campaign.packageId);
}

/** Bundle tier id only — undefined for discovery custom plans. */
export function resolveBundlePackageId(
  packageId: CampaignRecord["packageId"] | undefined,
): StudioGuidePackageId | undefined {
  if (!packageId || isCustomStudioPlanPackageId(packageId)) return undefined;
  return packageId;
}

const INTERNAL_CATEGORY_NAMES = new Set(SERVICE_CATEGORIES.map((category) => category.name));

const SKU_ID_PATTERN = /^[a-z][a-z0-9_-]*-\d{3}(-monthly)?$/i;

function isInternalSkuId(value: string): boolean {
  return SKU_ID_PATTERN.test(value.trim());
}

function isInternalCategoryLabel(value: string): boolean {
  return INTERNAL_CATEGORY_NAMES.has(value.trim());
}

/** Client-facing service name — never returns internal SKU IDs or category family labels. */
export function resolveClientFacingServiceName(
  skuId: ServiceId,
  line?: ApprovedStudioPlanLineItem | null,
): string {
  const snapshotName = (line?.serviceName ?? line?.name)?.trim();
  if (
    snapshotName &&
    !isInternalSkuId(snapshotName) &&
    !isInternalCategoryLabel(snapshotName)
  ) {
    return snapshotName;
  }

  const catalogName = getServiceById(skuId)?.name?.trim();
  if (catalogName) return catalogName;

  return snapshotName && !isInternalSkuId(snapshotName) ? snapshotName : catalogName ?? skuId;
}

export function resolveApprovedServiceIds(approved: ApprovedStudioPlan): ServiceId[] {
  if (approved.selectedServiceIds?.length > 0) {
    return [...approved.selectedServiceIds];
  }
  return [...approved.includedServiceIds, ...approved.additionalServiceIds];
}

/** Ordered client-facing names for every service in the approved plan snapshot. */
export function resolveApprovedPlanServiceNames(approved: ApprovedStudioPlan): string[] {
  const lineBySku = new Map(
    approved.lineItems.map((line) => [(line.skuId ?? line.serviceId!) as ServiceId, line]),
  );
  return resolveApprovedServiceIds(approved).map((skuId) =>
    resolveClientFacingServiceName(skuId, lineBySku.get(skuId)),
  );
}

/** Names aligned to a subset of SKUs (e.g. green Project Details services). */
export function resolveApprovedServiceDisplayNames(
  approved: ApprovedStudioPlan,
  serviceIds: readonly ServiceId[],
): string[] {
  const lineBySku = new Map(
    approved.lineItems.map((line) => [(line.skuId ?? line.serviceId!) as ServiceId, line]),
  );
  return serviceIds.map((skuId) =>
    resolveClientFacingServiceName(skuId, lineBySku.get(skuId)),
  );
}

export function campaignHasApprovedStudioPlan(
  campaign: CampaignRecord | null | undefined,
): campaign is CampaignRecord & { approvedStudioPlan: ApprovedStudioPlan } {
  return Boolean(campaign?.approvedStudioPlan);
}

/** Package panel + record drawer — approved plan line items first, bundle includes as fallback. */
export function resolveCampaignPlanIncludes(campaign: CampaignRecord): readonly string[] {
  const approved = campaign.approvedStudioPlan;
  if (approved) {
    return resolveApprovedPlanServiceNames(approved);
  }
  if (campaignUsesCustomStudioPlan(campaign)) {
    return [];
  }
  return getPackageIncludes(campaign.packageId);
}

export function resolveCampaignPlanLabel(campaign: CampaignRecord): string {
  if (campaign.approvedStudioPlan) return CUSTOM_STUDIO_PLAN_LABEL;
  return campaign.packageLabel;
}

export function resolveCampaignAmountPaidDisplay(campaign: CampaignRecord): string {
  const approved = campaign.approvedStudioPlan;
  if (approved && approved.amountDueTodayCents > 0) {
    return formatUsdFromCents(approved.amountDueTodayCents);
  }
  if (approved && (approved.oneTimeTotalCents > 0 || approved.monthlyTotalCents > 0)) {
    if (approved.monthlyTotalCents > 0 && approved.oneTimeTotalCents === 0) {
      return `${formatUsdFromCents(approved.monthlyTotalCents)}/month`;
    }
    return formatUsdFromCents(approved.oneTimeTotalCents);
  }
  if (approved || campaignUsesCustomStudioPlan(campaign)) {
    return studioBoard.accountPackage.pendingValue;
  }
  return studioBoard.packagePrices[campaign.packageId as keyof typeof studioBoard.packagePrices] ??
    studioBoard.membership.packagePrice;
}

export function resolveCampaignBillingTypeLabel(campaign: CampaignRecord): string {
  const { accountPackage: copy } = studioBoard;
  const approved = campaign.approvedStudioPlan;
  if (approved?.monthlyTotalCents && !approved.oneTimeTotalCents) {
    return copy.billingMonthly;
  }
  if (approved?.monthlyTotalCents && approved.oneTimeTotalCents) {
    return `${copy.billingOneTime} + ${copy.billingMonthly}`;
  }
  if (approved || campaignUsesCustomStudioPlan(campaign)) return copy.billingOneTime;
  return campaign.packageId === "spark" ? copy.billingOneTime : copy.billingMonthly;
}

function parseRevisionRoundsFromRule(rule: string): number {
  const match = rule.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 1;
}

/** Revision rounds from frozen approved-plan line items — not live catalog or package tiers. */
export function resolveApprovedPlanRevisionRounds(approved: ApprovedStudioPlan): number {
  if (!approved.lineItems.length) return 1;
  return Math.min(
    ...approved.lineItems.map((line) => parseRevisionRoundsFromRule(line.revisionRule)),
  );
}

export function resolveCampaignRevisionRounds(campaign: CampaignRecord): number {
  if (campaign.revisionRoundsIncluded != null) return campaign.revisionRoundsIncluded;
  if (campaign.approvedStudioPlan) {
    return resolveApprovedPlanRevisionRounds(campaign.approvedStudioPlan);
  }
  if (campaignUsesCustomStudioPlan(campaign)) return 1;
  return getPackageRevisionRounds(campaign.packageId);
}
