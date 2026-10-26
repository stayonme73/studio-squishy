import type { ServiceId } from "@/catalog/types";
import type { RouteMapIntakeAnswers, RouteMapIntakeSchema } from "@/config/route-map-intake-v1";
import {
  getRouteMapJob,
  type RouteMapJobId,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";
import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import {
  resolveRouteMapRestoredJourney,
  type RouteMapRestoredJourney,
} from "@/lib/route-map-campaign";
import { isIntakeComplete } from "@/lib/studio-board-campaign";
import {
  needsFlyerProductionIntakeCorrection,
} from "@/lib/project-intake-flyer-production";
import {
  clipIntakeOptionalKeys,
  clipIntakeVisibleGaps,
  clipProductionFactsSaved,
  kitIntakeOptionalKeys,
  kitIntakeVisibleGaps,
  shortFormIntakeOptionalKeys,
  shortFormIntakeVisibleGaps,
  socialIntakeOptionalKeys,
  socialIntakeVisibleGaps,
  projectIntakeServiceFieldKey,
  withSavedIntakeContact,
} from "@/lib/project-intake-plan";

/** Customer-facing gate when Intake cannot (or should not) open as an editable form. */
export type IntakeEntrySurface =
  | {
      kind: "form";
      jobId: RouteMapJobId;
      roadId: RouteMapRoadId;
      selectedServiceIds: readonly ServiceId[];
      draftAnswers: RouteMapIntakeAnswers | null;
      /** Submitted Intake that still needs flyer production fields only. */
      flyerProductionCorrection?: boolean;
      /** Current three-package offer. Intake uses this instead of a catalog schema. */
      condensedPackageId?:
        | "clip_repurposing"
        | "short_form_video_editing"
        | "social_and_promo_graphics"
        | "creative_qa_finish"
        | "campaign_launch_kit";
      condensedPackageName?: string;
      /** Clip only. Saved answers are not shown again. */
      clipAskOnce?:
        | { kind: "saved"; lead: string; action: string }
        | {
            kind: "gaps";
            keys: readonly string[];
            optionalKeys?: readonly string[];
            lead?: string;
          }
        | { kind: "missing-confirmation"; lead: string };
    }
  | { kind: "already-submitted" }
  | { kind: "missing-payment" }
  | { kind: "missing-plan"; recoveryHref: string; recoveryLabel: string }
  | { kind: "missing-context"; recoveryHref: string; recoveryLabel: string };

export type SocialPostsIntakeRestoredState = {
  purpose: string;
  purposeDetail: string;
  action: string;
  actionDestination: string;
  platform: string;
  materialActions: string[];
  materialNote: string;
  requiredWording: string;
  fileName: string;
  fileMimeType: string;
};

const EMPTY_SOCIAL: SocialPostsIntakeRestoredState = {
  purpose: "",
  purposeDetail: "",
  action: "",
  actionDestination: "",
  platform: "",
  materialActions: [],
  materialNote: "",
  requiredWording: "",
  fileName: "",
  fileMimeType: "",
};

function clipAskOnceForSavedAnswers(
  answers: RouteMapIntakeAnswers | null | undefined,
  contact: {
    businessName?: string | null;
    email?: string | null;
    purpose?: string | null;
  },
):
  | { kind: "saved"; lead: string; action: string }
  | { kind: "gaps"; keys: readonly string[]; optionalKeys: readonly string[]; lead: string }
  | { kind: "missing-confirmation"; lead: string } {
  const saved = clipProductionFactsSaved(answers);
  const gaps = clipIntakeVisibleGaps(answers, contact);
  if (saved && gaps.length === 0) {
    return {
      kind: "saved",
      lead: "Your answers are saved. Add the recording in My Studio.",
      action: "Add the recording in My Studio",
    };
  }
  if (gaps.length > 0) {
    return {
      kind: "gaps",
      keys: gaps,
      optionalKeys: clipIntakeOptionalKeys(answers),
      lead: "Confirm the recording. Notes are optional. You add the file in My Studio.",
    };
  }
  return {
    kind: "missing-confirmation",
    lead: "The source or audio confirmation from Build Your Project is missing. The Studio will not invent it.",
  };
}

function socialAskOnceForSavedAnswers(
  answers: RouteMapIntakeAnswers | null | undefined,
  contact: {
    businessName?: string | null;
    email?: string | null;
    purpose?: string | null;
  },
): { kind: "saved"; lead: string; action: string } | {
  kind: "gaps";
  keys: readonly string[];
  optionalKeys: readonly string[];
  lead: string;
} {
  const gaps = socialIntakeVisibleGaps(answers, contact);
  if (gaps.length === 0) {
    return {
      kind: "saved",
      lead: "Your answers are saved. Add your logo and photos in My Studio.",
      action: "Add the files in My Studio",
    };
  }
  return {
    kind: "gaps",
    keys: gaps,
    optionalKeys: socialIntakeOptionalKeys(answers),
    lead: "Confirm you can use the materials. Notes are optional. You add the files in My Studio.",
  };
}

function shortFormAskOnceForSavedAnswers(
  answers: RouteMapIntakeAnswers | null | undefined,
  contact: {
    businessName?: string | null;
    email?: string | null;
    purpose?: string | null;
  },
) {
  const gaps = shortFormIntakeVisibleGaps(answers, contact);
  if (gaps.length === 0) {
    return {
      kind: "saved" as const,
      lead: "Your answers are saved. Add the clips in My Studio.",
      action: "Add the clips in My Studio",
    };
  }
  return {
    kind: "gaps" as const,
    keys: gaps,
    optionalKeys: shortFormIntakeOptionalKeys(answers),
    lead: "Confirm the clips. Notes are optional. You add the files in My Studio.",
  };
}

/** Local look at the next page. No campaign and no payment. */
export function intakeLookSurface(input: {
  packageId: string;
  packageName: string;
  businessName: string;
  email: string;
  purpose: string;
  answers?: RouteMapIntakeAnswers | null;
}): Extract<IntakeEntrySurface, { kind: "form" }> | null {
  const packageId = input.packageId;
  if (
    packageId !== "clip_repurposing" &&
    packageId !== "short_form_video_editing" &&
    packageId !== "social_and_promo_graphics" &&
    packageId !== "campaign_launch_kit"
  ) {
    return null;
  }
  const contact = {
    businessName: input.businessName,
    email: input.email,
    purpose: input.purpose,
  };
  const storedAnswers = withSavedIntakeContact(input.answers ?? null, packageId, contact);
  const clipAskOnce =
    packageId === "clip_repurposing"
      ? clipAskOnceForSavedAnswers(storedAnswers, contact)
      : packageId === "social_and_promo_graphics"
        ? socialAskOnceForSavedAnswers(null, contact)
        : packageId === "short_form_video_editing"
          ? shortFormAskOnceForSavedAnswers(null, contact)
          : kitAskOnceForSavedAnswers(null, contact);
  const previewAskOnce =
    packageId === "clip_repurposing" && clipAskOnce.kind === "saved"
      ? {
          kind: "gaps" as const,
          keys: ["qualifyingSource", "intelligible", "rights"].map((fieldId) =>
            projectIntakeServiceFieldKey(packageId, fieldId),
          ),
          optionalKeys: ["context", "cta", "mustKeep", "mustNot"].map((fieldId) =>
            projectIntakeServiceFieldKey(packageId, fieldId),
          ),
          lead: "Confirm the recording. Notes are optional. You add the file in My Studio after payment.",
        }
      : clipAskOnce;
  if (packageId !== "clip_repurposing" && previewAskOnce.kind !== "gaps") return null;
  return {
    kind: "form",
    jobId: packageId as RouteMapJobId,
    roadId: "random-exit",
    selectedServiceIds: [],
    draftAnswers: storedAnswers,
    condensedPackageId: packageId,
    condensedPackageName: input.packageName,
    clipAskOnce: previewAskOnce,
  };
}

function kitAskOnceForSavedAnswers(
  answers: RouteMapIntakeAnswers | null | undefined,
  contact: {
    businessName?: string | null;
    email?: string | null;
    purpose?: string | null;
  },
) {
  const gaps = kitIntakeVisibleGaps(answers, contact);
  if (gaps.length === 0) {
    return {
      kind: "saved" as const,
      lead: "Your answers are saved. Add your logo and photos in My Studio.",
      action: "Add the files in My Studio",
    };
  }
  return {
    kind: "gaps" as const,
    keys: gaps,
    optionalKeys: kitIntakeOptionalKeys(answers),
    lead: "Add the offer details for this campaign. Notes are optional. You add the files in My Studio.",
  };
}

function firstLineAfterPrefix(block: string, prefix: RegExp): string {
  const match = block.match(prefix);
  return match?.[1]?.trim() ?? "";
}

/** Best-effort Social Posts restore from flattened draft answers (no image preview). */
export function socialPostsStateFromAnswers(
  answers: RouteMapIntakeAnswers | null | undefined,
): SocialPostsIntakeRestoredState {
  if (!answers) return { ...EMPTY_SOCIAL };

  const purpose = String(answers.socialPostsPurposeChoice ?? "").trim();
  const action = String(answers.socialPostsActionChoice ?? "").trim();
  const platform = String(answers.socialPostsPlatformChoice ?? "").trim();
  const materialsChoices = String(answers.socialPostsMaterialsChoices ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const postsAbout = String(answers.postsAbout ?? "");
  let purposeDetail = "";
  if (purpose && postsAbout.startsWith(`${purpose} — `)) {
    purposeDetail = postsAbout.slice(purpose.length + 3).trim();
  }

  const callToAction = String(answers.callToAction ?? "");
  const destinationMatch = callToAction.match(/Destination:\s*(.+)$/i);
  let actionDestination = destinationMatch?.[1]?.trim() ?? "";
  if (!actionDestination && action && callToAction.startsWith(`${action} — `)) {
    actionDestination = callToAction.slice(action.length + 3).trim();
  }

  const materials = String(answers.materials ?? "");
  const fileName = firstLineAfterPrefix(materials, /Selected file:\s*(.+)/i);
  const fileMimeType = firstLineAfterPrefix(materials, /File type:\s*(.+)/i);
  const materialNote = firstLineAfterPrefix(materials, /Notes:\s*(.+)/i);

  const wordingRaw = String(answers.wordingHashtags ?? "").trim();
  const requiredWording =
    wordingRaw === "No required wording, disclosures, or hashtags provided yet."
      ? ""
      : wordingRaw;

  return {
    purpose,
    purposeDetail,
    action,
    actionDestination,
    platform,
    materialActions: materialsChoices,
    materialNote,
    requiredWording,
    fileName,
    fileMimeType,
  };
}

/** Restore only schema field ids that exist on the live form. */
export function schemaAnswersFromDraft(
  schema: RouteMapIntakeSchema,
  draft: RouteMapIntakeAnswers | null | undefined,
): RouteMapIntakeAnswers {
  const next: RouteMapIntakeAnswers = Object.fromEntries(
    schema.fields.map((field) => [field.id, ""]),
  );
  if (!draft) return next;
  for (const field of schema.fields) {
    const value = draft[field.id];
    if (typeof value === "string") next[field.id] = value;
  }
  return next;
}

export function readUsableIntakeDraftAnswers(
  campaign: CampaignRecord | null | undefined,
): RouteMapIntakeAnswers | null {
  const answers = campaign?.routeMapIntakeDraft?.answers;
  if (!answers || typeof answers !== "object") return null;
  return answers;
}

/**
 * Local Project Intake in progress — protect from being replaced by a different
 * server "current" campaign (Owner QA / dual-write races).
 */
export function hasProtectedLocalIntakeDraft(
  campaign: CampaignRecord | null | undefined,
): boolean {
  if (!campaign?.paymentReceivedAt) return false;
  if (isIntakeComplete(campaign)) return false;
  return Boolean(readUsableIntakeDraftAnswers(campaign));
}

/**
 * Same-campaign hydrate: keep a newer or only-local Intake draft on the record.
 */
export function mergeCampaignPreferLocalIntakeDraft(
  server: CampaignRecord,
  local: CampaignRecord,
): CampaignRecord {
  if (server.campaignId !== local.campaignId) return server;
  if (isIntakeComplete(local) && !isIntakeComplete(server)) {
    return {
      ...server,
      routeMapIntake: local.routeMapIntake ?? server.routeMapIntake,
      routeMapIntakeDraft: local.routeMapIntakeDraft ?? server.routeMapIntakeDraft,
      routeMapIntakeSubmittedAt:
        local.routeMapIntakeSubmittedAt ?? server.routeMapIntakeSubmittedAt,
      projectDetailsSubmittedAt:
        local.projectDetailsSubmittedAt ?? server.projectDetailsSubmittedAt,
      visionSubmittedAt: local.visionSubmittedAt ?? server.visionSubmittedAt,
      intake: local.intake ?? server.intake,
    };
  }
  if (isIntakeComplete(server) || isIntakeComplete(local)) {
    return server.routeMapIntakeDraft ? server : { ...server, routeMapIntakeDraft: local.routeMapIntakeDraft };
  }

  const serverDraft = server.routeMapIntakeDraft;
  const localDraft = local.routeMapIntakeDraft;
  if (!localDraft?.answers) return server;
  if (!serverDraft?.answers) {
    return { ...server, routeMapIntakeDraft: localDraft };
  }
  if ((localDraft.savedAt ?? "") >= (serverDraft.savedAt ?? "")) {
    return { ...server, routeMapIntakeDraft: localDraft };
  }
  return server;
}

function isRouteMapRoadId(value: unknown): value is RouteMapRoadId {
  return (
    value === "i75" ||
    value === "i20" ||
    value === "update" ||
    value === "random-exit" ||
    value === "i285"
  );
}

function restoreIntakeJourneyFromApprovedPlan(
  campaign: CampaignRecord,
): RouteMapRestoredJourney | null {
  const selectedServiceIds = campaign.approvedStudioPlan?.selectedServiceIds ?? [];
  if (selectedServiceIds.length === 0) return null;
  const jobId = selectedServiceIds[0] as RouteMapJobId;
  if (!getRouteMapJob(jobId)) return null;
  const roadId = campaign.routeMapContext?.roadId;
  if (!isRouteMapRoadId(roadId)) return null;
  return {
    step: "intake",
    jobId,
    roadId,
    selectedServiceIds,
  };
}

/**
 * Resolve what the customer should see when opening Project Intake (`?step=intake`
 * or restored currentStep intake).
 */
export function resolveIntakeEntrySurface(
  campaign: CampaignRecord | null,
  requestedStep: string | null,
): IntakeEntrySurface | null {
  const wantsIntake =
    requestedStep === "intake" || campaign?.routeMapContext?.currentStep === "intake";
  if (!wantsIntake) return null;

  if (campaign && isIntakeComplete(campaign)) {
    if (needsFlyerProductionIntakeCorrection(campaign)) {
      const restored = resolveRouteMapRestoredJourney(campaign.routeMapContext, "intake");
      if (restored) {
        return {
          kind: "form",
          jobId: restored.jobId,
          roadId: restored.roadId,
          selectedServiceIds: restored.selectedServiceIds,
          draftAnswers: {
            ...(campaign.routeMapIntake?.answers ?? {}),
            ...(readUsableIntakeDraftAnswers(campaign) ?? {}),
          },
          flyerProductionCorrection: true,
        };
      }
    }
    return { kind: "already-submitted" };
  }

  if (!campaign) {
    return {
      kind: "missing-context",
      recoveryHref: legacyRouteQuarantineV1.activeFrontDoor,
      recoveryLabel: "Return to Conversation Room",
    };
  }

  if (!campaign.paymentReceivedAt) {
    return { kind: "missing-payment" };
  }

  if (campaign.condensedOffer) {
    const roadId = campaign.routeMapContext?.roadId;
    const packageId = campaign.condensedOffer.packageId;
    const storedDraft = readUsableIntakeDraftAnswers(campaign);
    const savedContact = {
      businessName: campaign.condensedOffer.company,
      purpose: campaign.condensedOffer.projectNeed,
    };
    const draftAnswers = withSavedIntakeContact(
      packageId === "clip_repurposing" ||
        packageId === "social_and_promo_graphics" ||
        packageId === "short_form_video_editing" ||
        packageId === "campaign_launch_kit"
        ? {
            ...(storedDraft ?? {}),
            ...(campaign.routeMapIntake?.answers ?? {}),
          }
        : storedDraft,
      packageId,
      savedContact,
    );
    const clipAskOnce =
      packageId === "clip_repurposing"
        ? clipAskOnceForSavedAnswers(draftAnswers, savedContact)
        : packageId === "social_and_promo_graphics"
          ? socialAskOnceForSavedAnswers(draftAnswers, savedContact)
          : packageId === "short_form_video_editing"
            ? shortFormAskOnceForSavedAnswers(draftAnswers, savedContact)
            : packageId === "campaign_launch_kit"
              ? kitAskOnceForSavedAnswers(draftAnswers, savedContact)
              : undefined;
    return {
      kind: "form",
      jobId: packageId as RouteMapJobId,
      roadId: isRouteMapRoadId(roadId) ? roadId : "random-exit",
      selectedServiceIds: [],
      draftAnswers,
      condensedPackageId: packageId,
      condensedPackageName: campaign.condensedOffer.name,
      ...(clipAskOnce ? { clipAskOnce } : {}),
    };
  }

  if (!campaign.approvedStudioPlan) {
    const roadId = campaign.routeMapContext?.roadId;
    if (roadId) {
      return {
        kind: "missing-plan",
        recoveryHref: "/studio-conversation-room?stage=plan",
        recoveryLabel: "Return to Studio Plan",
      };
    }
    return {
      kind: "missing-plan",
      recoveryHref: legacyRouteQuarantineV1.activeFrontDoor,
      recoveryLabel: "Return to Conversation Room",
    };
  }

  const restored =
    resolveRouteMapRestoredJourney(campaign.routeMapContext, "intake") ??
    restoreIntakeJourneyFromApprovedPlan(campaign);
  if (!restored) {
    return {
      kind: "missing-context",
      recoveryHref: studioBoard.routes.studioBoard,
      recoveryLabel: "Return to Studio Board",
    };
  }

  return {
    kind: "form",
    jobId: restored.jobId,
    roadId: restored.roadId,
    selectedServiceIds: restored.selectedServiceIds,
    draftAnswers: readUsableIntakeDraftAnswers(campaign),
  };
}

export const INTAKE_CONTINUITY_COPY = {
  alreadySubmittedTitle: "Your Project Intake has already been submitted.",
  alreadySubmittedLead:
    "Your answers are on record. Open Studio Board to see your project home.",
  alreadySubmittedCta: "Return to Studio Board",
  flyerCorrectionTitle: "A few flyer details are still needed.",
  flyerCorrectionLead:
    "Your Project Intake is already on record. Please add only the flyer details below so the Studio can start this work.",
  missingPaymentTitle: "Payment is still needed before Project Intake.",
  missingPaymentLead:
    "Complete Review and Confirm for this project, then Project Intake will open.",
  missingPaymentCta: "Return to Checkout",
  missingPlanTitle: "Your Studio Plan is not ready for Project Intake yet.",
  missingPlanLead:
    "Return to your plan so The Studio knows which services this Intake belongs to.",
  missingContextTitle: "We could not open Project Intake for this project.",
  missingContextLead:
    "The project context needed for Intake is missing or incomplete. Use the recovery action below to continue.",
  submitFailed:
    "We could not submit Project Intake. Check your connection, then try again.",
} as const;
