/**
 * SKU-appropriate internal correction for general Design Production.
 * Reuses Package A architecture (bounded attempts, no customer revision)
 * without flyer geometry constraints.
 */

import { isCampaignGraphicsLightHardenSku } from "@/config/studio-campaign-graphics-light-harden-v1";
import { isMenuLightHardenSku } from "@/config/studio-menu-light-harden-v1";
import { isServiceSheetLightHardenSku } from "@/config/studio-service-sheet-light-harden-v1";
import { isBusinessCardLightHardenSku } from "@/config/studio-business-card-light-harden-v1";
import { isShortVideoStandardHardenSku } from "@/config/studio-short-video-standard-harden-v1";
import { isSocialPostsStandardHardenSku } from "@/config/studio-social-posts-standard-harden-v1";
import {
  studioGeneralDesignRuntimeV1,
  type GeneralDesignInternalLoopRecord,
} from "@/config/studio-general-design-runtime-v1";
import {
  customerArtContainsForbiddenFragment,
  sanitizeCustomerDisclaimer,
} from "@/lib/studio-design-renderer/customer-facing-creative-copy";

export const CHROME_CORRECTABLE_FAILURE_CODES = new Set([
  "FIXTURE_LEAKAGE",
]);

export function createGeneralDesignInternalLoop(input: {
  skuId: string;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  occurredAt?: string;
}): GeneralDesignInternalLoopRecord {
  const now = input.occurredAt ?? new Date().toISOString();
  return {
    packageId: studioGeneralDesignRuntimeV1.packageId,
    skuId: input.skuId,
    campaignId: input.campaignId,
    jobId: input.jobId,
    dispatchId: input.dispatchId,
    status: "in_progress",
    maxAttempts: studioGeneralDesignRuntimeV1.maxInternalProductionAttempts,
    attempts: [],
    ownerEscalation: null,
    updatedAt: now,
  };
}

export function remainingGeneralDesignAttempts(
  loop: GeneralDesignInternalLoopRecord,
): number {
  return Math.max(0, loop.maxAttempts - loop.attempts.length);
}

export function appendGeneralDesignAttempt(
  loop: GeneralDesignInternalLoopRecord,
  attempt: GeneralDesignInternalLoopRecord["attempts"][number],
): GeneralDesignInternalLoopRecord {
  const attempts = [...loop.attempts, attempt];
  const passed = attempt.qaResult === "pass";
  const exhausted = attempts.length >= loop.maxAttempts && !passed;
  const failClosed =
    exhausted &&
    (isServiceSheetLightHardenSku(loop.skuId) ||
      isCampaignGraphicsLightHardenSku(loop.skuId) ||
      isMenuLightHardenSku(loop.skuId) ||
      isSocialPostsStandardHardenSku(loop.skuId) ||
      isBusinessCardLightHardenSku(loop.skuId) ||
      isShortVideoStandardHardenSku(loop.skuId));
  return {
    ...loop,
    attempts,
    status: passed ? "passed" : exhausted ? (failClosed ? "fail_closed" : "escalated") : "in_progress",
    ownerEscalation:
      exhausted && !passed && !failClosed
        ? {
            required: true,
            reason: "Internal general-design correction budget exhausted.",
            at: attempt.completedAt,
          }
        : exhausted && failClosed
          ? null
          : loop.ownerEscalation,
    updatedAt: attempt.completedAt,
  };
}

export function isChromeCorrectableFailure(failureCode: string | undefined): boolean {
  return Boolean(failureCode && CHROME_CORRECTABLE_FAILURE_CODES.has(failureCode));
}

export function applyGeneralDesignChromeCorrection<
  T extends { disclaimer?: string },
>(truth: T): T {
  return {
    ...truth,
    disclaimer: sanitizeCustomerDisclaimer(truth.disclaimer ?? ""),
  };
}

export function customerTextHasProductionChrome(text: string): boolean {
  return customerArtContainsForbiddenFragment(text) != null;
}
