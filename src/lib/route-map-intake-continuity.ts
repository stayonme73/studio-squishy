import type { ServiceId } from "@/catalog/types";
import type { RouteMapIntakeAnswers, RouteMapIntakeSchema } from "@/config/route-map-intake-v1";
import type { RouteMapJobId, RouteMapRoadId } from "@/config/route-map-v1";
import { projectBuilderHref } from "@/config/project-builder-v1";
import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import { resolveRouteMapRestoredJourney } from "@/lib/route-map-campaign";
import { isIntakeComplete } from "@/lib/studio-board-campaign";

/** Customer-facing gate when Intake cannot (or should not) open as an editable form. */
export type IntakeEntrySurface =
  | {
      kind: "form";
      jobId: RouteMapJobId;
      roadId: RouteMapRoadId;
      selectedServiceIds: readonly ServiceId[];
      draftAnswers: RouteMapIntakeAnswers | null;
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
  const actionDestination = destinationMatch?.[1]?.trim() ?? "";

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

  if (isIntakeComplete(campaign)) {
    return { kind: "already-submitted" };
  }

  if (!campaign) {
    return {
      kind: "missing-context",
      recoveryHref: studioBoard.routes.newCampaign,
      recoveryLabel: "Return to Route Map",
    };
  }

  if (!campaign.paymentReceivedAt) {
    return { kind: "missing-payment" };
  }

  if (!campaign.approvedStudioPlan) {
    const roadId = campaign.routeMapContext?.roadId;
    if (roadId) {
      return {
        kind: "missing-plan",
        recoveryHref: `${projectBuilderHref(roadId)}&view=studio-plan`,
        recoveryLabel: "Return to Studio Plan",
      };
    }
    return {
      kind: "missing-plan",
      recoveryHref: studioBoard.routes.newCampaign,
      recoveryLabel: "Return to Route Map",
    };
  }

  const restored = resolveRouteMapRestoredJourney(campaign.routeMapContext, "intake");
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
  missingPaymentTitle: "Payment is still needed before Project Intake.",
  missingPaymentLead:
    "Complete Secure Checkout for this project, then Project Intake will open.",
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
