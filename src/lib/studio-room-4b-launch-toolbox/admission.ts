/**
 * Room 4B — deadline and carousel admission (pure).
 * Conservative: full campaign with video + revision needs >=7 calendar days.
 */

import type { StudioRoom4bClassificationLabel } from "@/config/studio-room-4b-launch-toolbox-certification-v1";

export type CampaignDeadlineAdmissionInput = {
  requestedDeliveryIso: string;
  nowIso: string;
  includesRevisionRound: boolean;
  includesVideo: boolean;
};

export type CampaignDeadlineAdmissionResult = {
  admit: boolean;
  earliestFeasibleIso?: string;
  reason: string;
  customerFacingMessage: string;
};

export type CarouselAdmissionResult = {
  admit: false;
  reason: "catalog_exclusion_on_social_posts";
  customerFacingMessage: string;
};

export type ToolboxComponentId =
  | "short-form-video"
  | "campaign-creative"
  | "social-graphics"
  | "carousel"
  | "marketing-copy"
  | "promotional-email"
  | "print-collateral"
  | "content-repurposing"
  | "level-1-ads"
  | "motion-creative"
  | "brand-refresh"
  | "landing-page-content";

export type ToolboxComponentEvidence = {
  produced?: boolean;
  qaPassed?: boolean;
  reviewed?: boolean;
  revised?: boolean;
  inspected?: boolean;
  delivered?: boolean;
  limits?: readonly string[];
  blockers?: readonly string[];
  notes?: string;
};

export type ToolboxComponentClassification = {
  id: ToolboxComponentId;
  label: StudioRoom4bClassificationLabel;
  reason: string;
  evidence: ToolboxComponentEvidence;
};

/** Minimum calendar days for full campaign with video + included revision. */
export const FULL_CAMPAIGN_MIN_CALENDAR_DAYS = 7 as const;

function startOfUtcDay(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function calendarDaysBetween(nowIso: string, requestedDeliveryIso: string): number {
  const a = startOfUtcDay(nowIso).getTime();
  const b = startOfUtcDay(requestedDeliveryIso).getTime();
  return Math.round((b - a) / 86_400_000);
}

function addCalendarDaysIso(nowIso: string, days: number): string {
  const d = startOfUtcDay(nowIso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function isFullCampaign(input: CampaignDeadlineAdmissionInput): boolean {
  return input.includesVideo && input.includesRevisionRound;
}

/**
 * Admit only when production + QA + Review + revision + second QA + delivery + buffer fit.
 * Tomorrow-morning full campaign -> refuse.
 * Full campaign with video+revision -> require >=7 calendar days; day 7 is admit-with-limits.
 */
export function evaluateCampaignDeadlineAdmission(
  input: CampaignDeadlineAdmissionInput,
): CampaignDeadlineAdmissionResult {
  const days = calendarDaysBetween(input.nowIso, input.requestedDeliveryIso);
  const earliestFeasibleIso = addCalendarDaysIso(
    input.nowIso,
    FULL_CAMPAIGN_MIN_CALENDAR_DAYS,
  );

  if (days < 0) {
    return {
      admit: false,
      earliestFeasibleIso,
      reason: "requested_delivery_in_the_past",
      customerFacingMessage:
        "That delivery date has already passed. The earliest feasible window for this full campaign is about one week from today.",
    };
  }

  if (isFullCampaign(input) && days < FULL_CAMPAIGN_MIN_CALENDAR_DAYS) {
    const tomorrowLike = days <= 1;
    return {
      admit: false,
      earliestFeasibleIso,
      reason: tomorrowLike
        ? "tomorrow_morning_full_campaign_not_feasible"
        : "full_campaign_needs_at_least_seven_calendar_days",
      customerFacingMessage: tomorrowLike
        ? "We cannot deliver the full Fall Reset campaign by tomorrow morning. That timeline does not leave room for production, QA, your review, one included revision, a second QA pass, and delivery. The earliest feasible window is about one week from today."
        : "That Friday window is too tight for a full campaign with short video, QA, review, one included revision, second QA, and delivery. The earliest feasible window is about one week from today.",
    };
  }

  if (isFullCampaign(input) && days === FULL_CAMPAIGN_MIN_CALENDAR_DAYS) {
    return {
      admit: true,
      reason: "admit_with_limits_tight_buffer",
      customerFacingMessage:
        "We can target that date with limits: the schedule is tight, so keep scope locked, reply quickly on review, and expect little recovery buffer if something breaks.",
    };
  }

  if (isFullCampaign(input)) {
    return {
      admit: true,
      reason: "admit_full_campaign_feasible",
      customerFacingMessage:
        "That delivery window can support the full campaign, including short video, QA, review, one included revision, and delivery.",
    };
  }

  if (days < 3) {
    return {
      admit: false,
      earliestFeasibleIso: addCalendarDaysIso(input.nowIso, 3),
      reason: "partial_campaign_too_soon",
      customerFacingMessage:
        "Even without the full video-and-revision path, that date is too soon. Please choose a later window.",
    };
  }

  return {
    admit: true,
    reason: "admit_partial_campaign",
    customerFacingMessage:
      "That date can work for the reduced scope you described. Confirm what's in and out before payment.",
  };
}

/** Carousel is a catalog exclusion on social posts — not sellable at launch. */
export function evaluateCarouselAdmission(): CarouselAdmissionResult {
  return {
    admit: false,
    reason: "catalog_exclusion_on_social_posts",
    customerFacingMessage:
      "Social carousels are not in the sellable launch catalog for social posts. We can produce static social graphics instead, within the purchased social-posts scope.",
  };
}

/**
 * Classify one toolbox component from evidence.
 * Pure helper — does not invent production capability.
 */
export function classifyToolboxComponent(
  id: ToolboxComponentId,
  evidence: ToolboxComponentEvidence,
): ToolboxComponentClassification {
  if (id === "carousel") {
    return {
      id,
      label: "NOT READY",
      reason: "catalog_exclusion_on_social_posts",
      evidence,
    };
  }

  if (evidence.blockers && evidence.blockers.length > 0) {
    return {
      id,
      label: "NOT READY",
      reason: evidence.blockers.join("; "),
      evidence,
    };
  }

  if (!evidence.produced) {
    return {
      id,
      label: "NOT READY",
      reason: "not_produced_in_this_certification",
      evidence,
    };
  }

  if (evidence.produced && (!evidence.qaPassed || !evidence.inspected)) {
    return {
      id,
      label: "NEEDS IMPROVEMENT",
      reason: "produced_but_qa_or_inspection_incomplete",
      evidence,
    };
  }

  if (evidence.limits && evidence.limits.length > 0) {
    return {
      id,
      label: "READY WITH LIMITS",
      reason: evidence.limits.join("; "),
      evidence,
    };
  }

  if (
    evidence.produced &&
    evidence.qaPassed &&
    evidence.reviewed &&
    evidence.inspected &&
    evidence.delivered
  ) {
    return {
      id,
      label: "READY FOR LAUNCH",
      reason: "produced_qa_reviewed_inspected_delivered",
      evidence,
    };
  }

  return {
    id,
    label: "READY WITH LIMITS",
    reason: evidence.notes ?? "partial_certification_path",
    evidence,
  };
}