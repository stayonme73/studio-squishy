/**
 * Honest Final Files — customer delivery view resolution.
 * Production never invents deliverable packages.
 */

import type { CampaignRecord } from "@/config/studio-board";
import {
  buildDeliverablesPackage,
  type CampaignDeliverablesPackage,
} from "@/config/deliverables";
import type {
  ClientJobDeliveryView,
  FinalDeliveryView,
} from "@/lib/job-control/final-delivery-view";
import { resolveDeliverableScopeFromCampaign } from "@/lib/deliverable-scope";

export type DeliverablesPageState =
  | "no-campaign"
  | "preparing"
  | "partial-files-ready"
  | "files-ready"
  | "delivered-no-files"
  | "preview-development-only";

export type PartialDeliveryVariant = "in-progress" | "some-files-missing" | null;

export type DeliverablesView = {
  state: DeliverablesPageState;
  campaignName: string;
  /** Null when the customer has no selected option — UI must omit the row. */
  selectedOption: string | null;
  completionDate: string;
  statusLabel: string;
  package: CampaignDeliverablesPackage | null;
  showGreetingName: boolean;
  finalDelivery: FinalDeliveryView | null;
  useJobDelivery: boolean;
  /** Which partial-delivery headline to use when state is partial-files-ready. */
  partialVariant: PartialDeliveryVariant;
  /** True only when every active delivered job has released files and API reports all delivered. */
  allowsFullCompletionLanguage: boolean;
};

export const HONEST_DELIVERY_COPY = {
  deliveredNoFiles: {
    title: "Final files are not available yet",
    body: "This project is marked delivered, but The Studio has not released downloadable files for you yet. There is nothing you need to do right now. The Studio will make the files available here when they are ready.",
    perJob: "No released files are available for this service yet. The Studio is responsible for providing them.",
  },
  partialInProgress: {
    badge: "Delivery in progress",
    title: "Some of your files are ready",
    lead: "You can download the released files below. Other work is still with The Studio.",
  },
  partialSomeMissing: {
    badge: "Delivery in progress",
    title: "Some files are ready; some are still being prepared",
    lead: "Download what is released below. Services without files are waiting on The Studio.",
  },
} as const;

function formatCompletionDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function selectedOptionFromCampaign(campaign: CampaignRecord | null): string | null {
  const value = campaign?.selectedCampaignOption?.trim();
  return value ? value : null;
}

function totalReleasedFiles(jobs: readonly ClientJobDeliveryView[]): number {
  return jobs.reduce((sum, job) => sum + job.files.length, 0);
}

/**
 * Full campaign completion language — never uses campaignStatus alone.
 * Relies on FinalDeliveryView: cancelled jobs are not client-accessible, so they
 * do not appear in `jobs`. `allJobsDelivered` remains the API signal that every
 * campaign job (including non-visible) is delivered.
 */
export function allowsFullCompletionLanguage(delivery: FinalDeliveryView): boolean {
  if (delivery.state !== "ready") return false;
  if (delivery.jobs.length === 0) return false;
  if (!delivery.allJobsDelivered) return false;
  return delivery.jobs.every(
    (job) => job.spineStatus === "delivered" && job.files.length >= 1,
  );
}

function latestDeliveryDate(
  jobs: readonly ClientJobDeliveryView[],
  campaign: CampaignRecord | null,
): string {
  const latestDelivered = jobs
    .map((job) => job.deliveredAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  if (latestDelivered) return formatCompletionDate(latestDelivered);
  if (campaign?.updatedAt) return formatCompletionDate(campaign.updatedAt);
  return "—";
}

function resolveFromJobDelivery(
  campaign: CampaignRecord | null,
  finalDelivery: FinalDeliveryView,
): DeliverablesView {
  const jobs = finalDelivery.jobs;
  const released = totalReleasedFiles(jobs);
  const full = allowsFullCompletionLanguage(finalDelivery);
  const selectedOption = selectedOptionFromCampaign(campaign);
  const completionDate = latestDeliveryDate(jobs, campaign);

  if (released === 0) {
    return {
      state: "delivered-no-files",
      campaignName: finalDelivery.campaignName,
      selectedOption,
      completionDate,
      statusLabel: "FILES NOT AVAILABLE",
      package: null,
      showGreetingName: true,
      finalDelivery,
      useJobDelivery: true,
      partialVariant: null,
      allowsFullCompletionLanguage: false,
    };
  }

  if (full) {
    return {
      state: "files-ready",
      campaignName: finalDelivery.campaignName,
      selectedOption,
      completionDate,
      statusLabel: "DELIVERED",
      package: null,
      showGreetingName: true,
      finalDelivery,
      useJobDelivery: true,
      partialVariant: null,
      allowsFullCompletionLanguage: true,
    };
  }

  const allVisibleDelivered = jobs.every((job) => job.spineStatus === "delivered");
  const hasJobWithoutFiles = jobs.some((job) => job.files.length === 0);
  const partialVariant: PartialDeliveryVariant =
    allVisibleDelivered && hasJobWithoutFiles ? "some-files-missing" : "in-progress";

  return {
    state: "partial-files-ready",
    campaignName: finalDelivery.campaignName,
    selectedOption,
    completionDate,
    statusLabel: "Delivery in progress",
    package: null,
    showGreetingName: true,
    finalDelivery,
    useJobDelivery: true,
    partialVariant,
    allowsFullCompletionLanguage: false,
  };
}

export type ResolveDeliverablesViewOptions = {
  /**
   * Development-only preview request. Caller must set true only when
   * NODE_ENV === "development" and preview/room query is present.
   */
  previewDevelopmentOnly?: boolean;
  finalDelivery?: FinalDeliveryView | null;
};

export function resolveDeliverablesView(
  campaign: CampaignRecord | null,
  options?: ResolveDeliverablesViewOptions,
): DeliverablesView {
  const base: DeliverablesView = {
    state: "no-campaign",
    campaignName: "—",
    selectedOption: null,
    completionDate: "—",
    statusLabel: "—",
    package: null,
    showGreetingName: false,
    finalDelivery: options?.finalDelivery ?? null,
    useJobDelivery: false,
    partialVariant: null,
    allowsFullCompletionLanguage: false,
  };

  // Real job delivery always wins over preview.
  if (options?.finalDelivery?.state === "ready" && options.finalDelivery.jobs.length > 0) {
    return resolveFromJobDelivery(campaign, options.finalDelivery);
  }

  // Generated packages — development preview only (never production).
  if (options?.previewDevelopmentOnly) {
    const lineItems = campaign?.approvedStudioPlan?.lineItems;
    if (!campaign || !lineItems?.length) {
      return { ...base, state: "no-campaign" };
    }

    const scope = resolveDeliverableScopeFromCampaign(campaign);
    return {
      state: "preview-development-only",
      campaignName: campaign.campaignName,
      selectedOption: selectedOptionFromCampaign(campaign),
      completionDate: formatCompletionDate(campaign.updatedAt),
      statusLabel: "PREVIEW",
      package: buildDeliverablesPackage(campaign.campaignName, scope),
      showGreetingName: true,
      finalDelivery: null,
      useJobDelivery: false,
      partialVariant: null,
      allowsFullCompletionLanguage: false,
    };
  }

  if (!campaign) {
    return { ...base, state: "no-campaign" };
  }

  const selectedOption = selectedOptionFromCampaign(campaign);
  const finalDelivery = options?.finalDelivery ?? null;

  // Legacy DELIVERED with no accessible/released files → unavailable, never mock.
  if (campaign.campaignStatus === "DELIVERED") {
    return {
      state: "delivered-no-files",
      campaignName: campaign.campaignName,
      selectedOption,
      completionDate: formatCompletionDate(campaign.updatedAt),
      statusLabel: "FILES NOT AVAILABLE",
      package: null,
      showGreetingName: true,
      finalDelivery,
      useJobDelivery: false,
      partialVariant: null,
      allowsFullCompletionLanguage: false,
    };
  }

  return {
    state: "preparing",
    campaignName: campaign.campaignName,
    selectedOption,
    completionDate: "—",
    statusLabel: "PREPARING",
    package: null,
    showGreetingName: false,
    finalDelivery,
    useJobDelivery: false,
    partialVariant: null,
    allowsFullCompletionLanguage: false,
  };
}
