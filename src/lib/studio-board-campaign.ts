import type { DraftIntakePayload } from "@/config/draft-room";
import { EMPTY_DRAFT_INTAKE_FORM } from "@/config/draft-room";
import { getPackageRevisionRounds, getStudioGuidePackage, type StudioGuidePackageId, type DeliverableQuotaId } from "@/config/studio-guide";
import { clearDiscoveryAnswers } from "@/lib/business-discovery-session";
import { readLastDraftIntake } from "@/lib/draft-intake";
import { ensureCampaignConceptsOnRecord } from "@/lib/campaign-concepts";
import {
  mergeVisionData,
  normalizeDraftIntakeFormValues,
  resolveCampaignCustomerName,
  resolveDraftIntakeProject,
  visionDataHasContent,
} from "@/lib/campaign-vision";
import { visionDataFromPayload } from "@/lib/campaign-record";
import { isIntakeEditable } from "@/lib/intake-edit";
import {
  CAMPAIGN_STATUSES,
  studioBoard,
  type CampaignIntakeSnapshot,
  type CampaignRecord,
  type CampaignStatus,
} from "@/config/studio-board";

const { statusContent } = studioBoard;

const CAMPAIGN_KEY = "studio-squishy:current-campaign";
const DRAFT_KEY = "studio-squishy:last-draft";
const LEGACY_FINAL_ASSETS_STATUS = "FINAL_ASSETS_IN_PROGRESS";

function campaignWithStatus(campaign: CampaignRecord, status: CampaignStatus): CampaignRecord {
  const content = statusContent[status];
  return {
    ...campaign,
    campaignStatus: status,
    campaignDescription: content.campaignDescription,
    estimatedCompletion: content.estimatedCompletion,
    updatedAt: new Date().toISOString(),
  };
}

function pushStudioNote(campaign: CampaignRecord, message: string, date = "Today"): CampaignRecord {
  return {
    ...campaign,
    studioNotes: [...(campaign.studioNotes ?? []), { date, message }],
  };
}

function intakeComplete(campaign: CampaignRecord): boolean {
  return Boolean(
    campaign.visionSubmittedAt ||
      campaign.intake?.submittedAt ||
      campaign.intake?.idea?.trim(),
  );
}

function enterBuildingConcepts(campaign: CampaignRecord): CampaignRecord {
  return campaignWithStatus(campaign, "BUILDING_CONCEPTS");
}

function persistCampaign(campaign: CampaignRecord): CampaignRecord {
  saveCurrentCampaign(campaign);
  dispatchCampaignUpdated();
  return campaign;
}

function dispatchCampaignUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
  }
}

function migrateCampaignStatus(status: string): CampaignStatus {
  if (status === LEGACY_FINAL_ASSETS_STATUS) return "BUILDING_CONCEPTS";
  if ((CAMPAIGN_STATUSES as readonly string[]).includes(status)) {
    return status as CampaignStatus;
  }
  return "DRAFT_RECEIVED";
}

function normalizeCampaignRecord(raw: CampaignRecord): CampaignRecord {
  const campaignStatus = migrateCampaignStatus(raw.campaignStatus as string);
  if (campaignStatus === raw.campaignStatus) return raw;
  return { ...raw, campaignStatus };
}

function campaignNameFromProject(project: string) {
  const trimmed = project.trim();
  if (!trimmed) return "New Campaign";
  if (trimmed.length <= 64) return trimmed;
  return `${trimmed.slice(0, 61)}…`;
}

export function readCurrentCampaign(): CampaignRecord | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CAMPAIGN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CampaignRecord;
    const normalized = normalizeCampaignRecord(parsed);
    if (normalized !== parsed) {
      saveCurrentCampaign(normalized);
    }
    return normalized;
  } catch {
    return null;
  }
}

export function saveCurrentCampaign(campaign: CampaignRecord) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
}

function intakeFromDraft(draft: DraftIntakePayload): CampaignIntakeSnapshot {
  return {
    idea: draft.idea.trim(),
    audience: draft.audience.trim(),
    action: draft.action.trim(),
    deadline: draft.deadline.trim(),
    submittedAt: draft.submittedAt,
  };
}

/** Backfill intake + vision data on campaigns saved before full persistence shipped. */
export function hydrateCampaignIntake(): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  if (!campaign) return campaign;

  const draft = readLastDraftIntake();
  if (!draft) return campaign;

  const recordVision = campaign.visionData
    ? normalizeDraftIntakeFormValues({
        ...EMPTY_DRAFT_INTAKE_FORM,
        ...campaign.visionData,
      })
    : null;

  const draftVision = visionDataFromPayload(draft);
  if (!visionDataHasContent(draftVision) && !draft.idea.trim()) return campaign;

  const visionData = recordVision
    ? mergeVisionData(recordVision, draftVision)
    : draftVision;

  if (
    recordVision &&
    visionDataHasContent(recordVision) &&
    campaign.intake?.submittedAt &&
    JSON.stringify(visionData) === JSON.stringify(recordVision)
  ) {
    return campaign;
  }

  const updated: CampaignRecord = {
    ...campaign,
    intake: intakeFromDraft(draft),
    visionData,
    visionSubmittedAt: campaign.visionSubmittedAt ?? draft.submittedAt,
    revisionRoundsIncluded:
      campaign.revisionRoundsIncluded ?? getPackageRevisionRounds(draft.packageId),
    revisionRoundsUsed: campaign.revisionRoundsUsed ?? 0,
    deliverablesDelivered: campaign.deliverablesDelivered ?? {},
    studioNotes: campaign.studioNotes ?? [...statusContent.DRAFT_RECEIVED.studioUpdates],
  };

  saveCurrentCampaign(updated);
  dispatchCampaignUpdated();
  return updated;
}

export function readCurrentCampaignHydrated(): CampaignRecord | null {
  return hydrateCampaignIntake() ?? readCurrentCampaign();
}

function createCampaignFromPayment(packageId: StudioGuidePackageId): CampaignRecord {
  const pkg = getStudioGuidePackage(packageId);
  const content = statusContent.PAYMENT_RECEIVED;
  const now = new Date().toISOString();

  return {
    campaignId: crypto.randomUUID(),
    campaignName: pkg ? `${pkg.label} Campaign` : "New Campaign",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: content.campaignDescription,
    estimatedCompletion: content.estimatedCompletion,
    packageId,
    packageLabel: pkg?.label ?? packageId,
    paymentReceivedAt: now,
    targetCompletionDate: null,
    revisionRoundsIncluded: getPackageRevisionRounds(packageId),
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: "Payment received." }],
    createdAt: now,
    updatedAt: now,
  };
}

export function createCampaignFromIntake(payload: DraftIntakePayload): CampaignRecord {
  const content = studioBoard.statusContent.DRAFT_RECEIVED;
  const now = new Date().toISOString();

  const vision = visionDataFromPayload(payload);

  return {
    campaignId: crypto.randomUUID(),
    campaignName: campaignNameFromProject(
      resolveCampaignCustomerName(vision) || resolveDraftIntakeProject(vision) || payload.project,
    ),
    campaignStatus: "DRAFT_RECEIVED",
    campaignDescription: content.campaignDescription,
    estimatedCompletion: content.estimatedCompletion,
    packageId: payload.packageId,
    packageLabel: payload.packageLabel,
    intake: {
      idea: payload.idea.trim(),
      audience: payload.audience.trim(),
      action: payload.action.trim(),
      deadline: payload.deadline.trim(),
      submittedAt: payload.submittedAt,
    },
    visionData: vision,
    visionSubmittedAt: payload.submittedAt,
    paymentReceivedAt: null,
    targetCompletionDate: null,
    revisionRoundsIncluded: getPackageRevisionRounds(payload.packageId),
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [...content.studioUpdates],
    createdAt: now,
    updatedAt: now,
  };
}

export function markPaymentReceived(
  packageId?: StudioGuidePackageId,
): CampaignRecord | null {
  let campaign = readCurrentCampaign();
  if (!campaign) {
    if (!packageId) return null;
    const created = createCampaignFromPayment(packageId);
    saveCurrentCampaign(created);
    dispatchCampaignUpdated();
    return created;
  }

  const pkg = packageId ? getStudioGuidePackage(packageId) : null;
  const now = new Date().toISOString();
  let updated: CampaignRecord = {
    ...campaign,
    paymentReceivedAt: now,
    packageId: pkg?.id ?? campaign.packageId,
    packageLabel: pkg?.label ?? campaign.packageLabel,
    revisionRoundsIncluded:
      campaign.revisionRoundsIncluded ?? getPackageRevisionRounds(pkg?.id ?? campaign.packageId),
    updatedAt: now,
  };

  if (intakeComplete(updated)) {
    updated = enterBuildingConcepts(updated);
    updated = pushStudioNote(updated, "Payment received.");
  } else {
    updated = campaignWithStatus(updated, "PAYMENT_RECEIVED");
    updated = pushStudioNote(updated, "Payment received.");
  }

  return persistCampaign(updated);
}

export function updateCampaignStatus(status: CampaignStatus): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  if (!campaign) return null;
  return persistCampaign(campaignWithStatus(campaign, status));
}

/** Studio finished concepting — client can enter Review Room / Feedback Studio. */
export function ensureConceptsReadyForReview(): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  if (!campaign || campaign.campaignStatus !== "BUILDING_CONCEPTS") return campaign;

  const withConcepts = ensureCampaignConceptsOnRecord(campaign);
  if (!withConcepts?.concepts?.length) return campaign;

  let updated = campaignWithStatus(withConcepts, "READY_FOR_REVIEW");
  updated = pushStudioNote(updated, "Campaign concepts ready for your review.");
  return persistCampaign(updated);
}

/** Finalize after review — unlock Final Delivery. */
export function finalizeCampaignDelivery(campaign: CampaignRecord): CampaignRecord {
  return persistCampaign(campaignWithStatus(campaign, "DELIVERED"));
}

/** Mark campaign delivered when final package is ready (Phase 1). */
export function markCampaignDelivered(): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  if (!campaign) return null;
  return finalizeCampaignDelivery(campaign);
}

/** Complete review when direction is chosen and feedback is submitted. */
export function completeCampaignReviewIfReady(): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  if (!campaign || !campaign.selectedCampaignOption) return campaign;
  if (campaign.campaignStatus === "DELIVERED") return campaign;
  if (campaign.campaignStatus !== "READY_FOR_REVIEW") return campaign;
  return finalizeCampaignDelivery(campaign);
}

/** Dev/testing — clear saved campaign, draft intake, and discovery answers from this browser. */
export function clearCampaignState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CAMPAIGN_KEY);
  window.localStorage.removeItem(DRAFT_KEY);
  clearDiscoveryAnswers();
  dispatchCampaignUpdated();
}

export class IntakeLockedError extends Error {
  constructor() {
    super("INTAKE_LOCKED");
    this.name = "IntakeLockedError";
  }
}

export function upsertCampaignFromIntake(payload: DraftIntakePayload) {
  const existing = readCurrentCampaign();

  if (existing) {
    if (!isIntakeEditable(existing.campaignStatus)) {
      throw new IntakeLockedError();
    }

    const wasIntakeIncomplete = !intakeComplete(existing);
    const resubmitting = Boolean(existing.visionSubmittedAt || existing.intake?.submittedAt);
    const now = payload.submittedAt;

    let updated: CampaignRecord = {
      ...existing,
      campaignName: campaignNameFromProject(
        resolveCampaignCustomerName(visionDataFromPayload(payload)) ||
          resolveDraftIntakeProject(visionDataFromPayload(payload)) ||
          payload.project,
      ),
      packageId: payload.packageId,
      packageLabel: payload.packageLabel,
      intake: intakeFromDraft(payload),
      visionData: (() => {
        const nextVision = visionDataFromPayload(payload);
        const existingVision = existing.visionData
          ? normalizeDraftIntakeFormValues({
              ...EMPTY_DRAFT_INTAKE_FORM,
              ...existing.visionData,
            })
          : null;
        return existingVision ? mergeVisionData(nextVision, existingVision) : nextVision;
      })(),
      visionSubmittedAt: payload.submittedAt,
      revisionRoundsIncluded:
        existing.revisionRoundsIncluded ?? getPackageRevisionRounds(payload.packageId),
      updatedAt: now,
    };

    if (
      existing.paymentReceivedAt &&
      wasIntakeIncomplete &&
      intakeComplete(updated) &&
      !resubmitting
    ) {
      updated = enterBuildingConcepts(updated);
      updated = pushStudioNote(updated, "Vision Intake received.");
    } else {
      updated = pushStudioNote(
        updated,
        resubmitting ? "Vision Intake updated." : "Vision Intake received.",
      );
    }

    return persistCampaign(updated);
  }

  const campaign = createCampaignFromIntake(payload);
  return persistCampaign(campaign);
}

export function recordRevisionRoundUsed(): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  if (!campaign) return null;

  const included =
    campaign.revisionRoundsIncluded ?? getPackageRevisionRounds(campaign.packageId);
  const used = campaign.revisionRoundsUsed ?? 0;
  if (used >= included) return campaign;

  const updated: CampaignRecord = {
    ...campaign,
    revisionRoundsUsed: used + 1,
    updatedAt: new Date().toISOString(),
  };

  saveCurrentCampaign(updated);
  dispatchCampaignUpdated();
  return updated;
}

export function recordDeliverableDelivered(
  deliverableId: DeliverableQuotaId,
  count = 1,
): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  if (!campaign) return null;

  const delivered = { ...(campaign.deliverablesDelivered ?? {}) };
  delivered[deliverableId] = (delivered[deliverableId] ?? 0) + count;

  const updated: CampaignRecord = {
    ...campaign,
    deliverablesDelivered: delivered,
    updatedAt: new Date().toISOString(),
  };

  saveCurrentCampaign(updated);
  dispatchCampaignUpdated();
  return updated;
}

export function selectCampaignOption(optionLabel: string): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  if (!campaign) return null;

  let updated: CampaignRecord = {
    ...campaign,
    selectedCampaignOption: optionLabel,
  };
  updated = pushStudioNote(updated, "Campaign direction selected.");

  if (updated.campaignStatus === "BUILDING_CONCEPTS") {
    updated = campaignWithStatus(updated, "READY_FOR_REVIEW");
  }

  return finalizeCampaignDelivery(updated);
}
