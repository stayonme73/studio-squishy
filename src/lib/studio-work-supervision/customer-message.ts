import type { StudioIncidentClass } from "@/config/studio-work-supervision-and-incident-escalation-v1";
import {
  isCopyKitLightHardenSku,
  isFailClosedSoldSku,
} from "@/config/studio-copy-kit-light-harden-v1";
import { isCampaignGraphicsLightHardenSku } from "@/config/studio-campaign-graphics-light-harden-v1";
import { isMenuLightHardenSku } from "@/config/studio-menu-light-harden-v1";
import { isServiceSheetLightHardenSku } from "@/config/studio-service-sheet-light-harden-v1";
import { isBusinessCardLightHardenSku } from "@/config/studio-business-card-light-harden-v1";
import { isShortVideoStandardHardenSku } from "@/config/studio-short-video-standard-harden-v1";
import { isSocialPostsStandardHardenSku } from "@/config/studio-social-posts-standard-harden-v1";

import type { CustomerIncidentMessage, SupervisionRecoveryAction } from "./types";

export function customerMessageForIncident(input: {
  class: StudioIncidentClass;
  serviceName: string;
  skuId?: string;
  recovery?: SupervisionRecoveryAction;
  ownerUnavailable?: boolean;
}): CustomerIncidentMessage {
  const service = input.serviceName || "your project";

  if (input.class === "customer_action_required") {
    return {
      whatHappened: `The Studio cannot continue ${service} until it has something from you.`,
      whatStudioIsDoing: "The Studio is paused on this step and is not inventing the missing information.",
      customerMustAct: true,
      customerAction: "Open Studio Board, read the request, and reply.",
      revisionEntitlementProtected: true,
      whatHappensNext: "Work resumes after your reply is recorded.",
    };
  }

  if (input.class === "studio_production_defect") {
    return {
      whatHappened: `The Studio reviewed the current ${service} and decided it was not good enough to send you.`,
      whatStudioIsDoing: "The Studio is correcting the work internally and will QA it again before Review opens.",
      customerMustAct: false,
      customerAction: "You do not need to do anything right now.",
      revisionEntitlementProtected: true,
      whatHappensNext:
        "Your included revision has not been counted. You will be notified when a version is ready for your review.",
    };
  }

  if (input.class === "system_stall") {
    return {
      whatHappened: `${service} stopped moving and the Studio caught the stall.`,
      whatStudioIsDoing: "A supervisor recovery is running inside the existing policy bounds.",
      customerMustAct: false,
      customerAction: "You do not need to do anything right now.",
      revisionEntitlementProtected: true,
      whatHappensNext: "You will receive another update if the job moves or if someone must step in.",
    };
  }

  if (
    input.recovery === "fail_closed_refund" ||
    (input.class === "recovery_exhausted" && isFailClosedSoldSku(input.skuId))
  ) {
    const noRescue = isCopyKitLightHardenSku(input.skuId)
      ? "Owner will not rewrite this copy by hand."
      : isServiceSheetLightHardenSku(input.skuId)
        ? "Owner will not finish the service sheet by hand."
        : isCampaignGraphicsLightHardenSku(input.skuId)
          ? "Owner will not finish the campaign graphics by hand."
          : isMenuLightHardenSku(input.skuId)
            ? "Owner will not finish the menu by hand."
            : isSocialPostsStandardHardenSku(input.skuId)
              ? "Owner will not finish the social posts by hand."
              : isBusinessCardLightHardenSku(input.skuId)
                ? "Owner will not finish the business card by hand."
                : isShortVideoStandardHardenSku(input.skuId)
                  ? "Owner will not finish the short video by hand."
                  : "Owner will not finish the flyer by hand.";
    return {
      whatHappened: `The Studio used its allowed production attempts on ${service} and still cannot deliver Studio-quality work on this job.`,
      whatStudioIsDoing:
        `This job is closed fail-closed. ${noRescue} Review stays closed.`,
      customerMustAct: false,
      customerAction: "You do not need to repair the Studio.",
      revisionEntitlementProtected: true,
      whatHappensNext:
        "The honest next step is a refund or cannot-deliver close. You will be told which.",
    };
  }

  if (input.class === "recovery_exhausted" || input.class === "owner_judgment") {
    return {
      whatHappened: `The Studio used its allowed recovery attempts on ${service} and still cannot finish the step on its own.`,
      whatStudioIsDoing: "The job is held for Owner judgment. Review stays closed if the work is not ready.",
      customerMustAct: false,
      customerAction: "You do not need to repair the Studio. Wait for the next honest update.",
      revisionEntitlementProtected: true,
      whatHappensNext: "The Studio will tell you when Owner judgment is recorded and what happens next.",
    };
  }

  if (input.class === "owner_unavailable_hold") {
    return {
      whatHappened: `${service} needs an Owner decision, and the Owner is not available right now.`,
      whatStudioIsDoing:
        "The Studio is holding the job. It will not invent an Owner approval or continue as if that decision were made.",
      customerMustAct: false,
      customerAction: "You do not need to act. The Studio will not silently resume.",
      revisionEntitlementProtected: true,
      whatHappensNext: "Work resumes only after the Owner decision is actually recorded.",
    };
  }

  if (input.class === "security_privacy_rights") {
    return {
      whatHappened: `The Studio paused ${service} because a rights, privacy, or security question must be judged.`,
      whatStudioIsDoing: "The job is held. Production will not guess.",
      customerMustAct: false,
      customerAction: "Wait for the Studio to tell you if anything is needed from you.",
      revisionEntitlementProtected: true,
      whatHappensNext: "Owner judgment is required before this job continues.",
    };
  }

  if (input.class === "studio_manager_review") {
    return {
      whatHappened: `The Studio paused ${service} for a quality or approach review.`,
      whatStudioIsDoing: "Studio Manager is reviewing the path. The Machine is not guessing a second approach.",
      customerMustAct: false,
      customerAction: "You do not need to do anything right now.",
      revisionEntitlementProtected: true,
      whatHappensNext: "You will be told when the review is recorded and work can continue.",
    };
  }

  return {
    whatHappened: `The Studio is handling a routine step on ${service}.`,
    whatStudioIsDoing: "Machine policy is completing the step. No Owner action is required.",
    customerMustAct: false,
    customerAction: "You do not need to do anything right now.",
    revisionEntitlementProtected: true,
    whatHappensNext: "You will see the next normal status when the step finishes.",
  };
}
