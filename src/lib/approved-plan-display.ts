import { getServiceById } from "@/catalog/accessors";
import { SERVICE_CATEGORIES } from "@/catalog/categories";
import type { ServiceId } from "@/catalog/types";
import type {
  ApprovedStudioPlan,
  ApprovedStudioPlanLineItem,
  CampaignRecord,
} from "@/config/studio-board";
import { getPackageIncludes, getPackageRevisionRounds } from "@/config/studio-guide";
import { studioBoard } from "@/config/studio-board";
import { formatUsdFromCents } from "@/lib/plan-pricing";

export const CUSTOM_STUDIO_PLAN_LABEL = "Custom Studio Plan";

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
  if (approved?.lineItems?.length) {
    return resolveApprovedPlanServiceNames(approved);
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
  return studioBoard.packagePrices[campaign.packageId] ?? studioBoard.membership.packagePrice;
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
  if (approved) return copy.billingOneTime;
  return campaign.packageId === "spark" ? copy.billingOneTime : copy.billingMonthly;
}

export function resolveCampaignRevisionRounds(campaign: CampaignRecord): number {
  if (campaign.revisionRoundsIncluded != null) return campaign.revisionRoundsIncluded;
  if (campaign.approvedStudioPlan) return 1;
  return getPackageRevisionRounds(campaign.packageId);
}
