/**
 * Read current-door Clip facts in the shape the existing factory expects.
 * Does not write a second intake record.
 */

import type { ServiceId } from "@/catalog/types";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { builderCopyForPackage } from "@/config/studio-customer-journey-condense-v1";
import type { RouteMapIntakeAnswers } from "@/catalog/intake";
import {
  clipProductionFactsSaved,
  projectIntakeServiceFieldKey,
  readProjectIntakeAnswer,
} from "@/lib/project-intake-plan";

export const CLIP_DOOR_PACKAGE_ID = "clip_repurposing" as ServiceId;

/** Factory field → the one current-door field that already holds that fact. */
export const CLIP_DOOR_FACTORY_FIELD_MAP = {
  videoPurpose: "purpose",
  talkingHeadConfirm: "qualifyingSource",
  rightsAcknowledgement: "rights",
  ctaText: "cta",
  mustKeepLine: "mustKeep",
} as const;

export type ClipFactoryFactField = keyof typeof CLIP_DOOR_FACTORY_FIELD_MAP;

export type ClipDoorCustomerAnswers = {
  purpose?: string;
  context?: string;
  cta?: string;
  mustKeep?: string;
  mustNot?: string;
  qualifyingSource?: boolean;
  intelligible?: boolean;
  rightsConfirmed?: boolean;
};

function clipCheckboxLabel(name: "qualifyingSource" | "intelligible" | "rights"): string {
  return (
    builderCopyForPackage("clip_repurposing").aboutProject.fields.find(
      (field) => field.name === name,
    )?.label ?? ""
  );
}

/**
 * One intake answer bag from facts the customer already submitted.
 * Checked sentences are stored as the sentence the customer agreed to.
 * Unchecked or blank answers are omitted. Nothing is invented.
 */
export function clipDoorIntakeAnswers(
  input: ClipDoorCustomerAnswers | null | undefined,
): RouteMapIntakeAnswers {
  if (!input) return {};
  const answers: RouteMapIntakeAnswers = {};
  const text: Array<[string, string | undefined]> = [
    ["purpose", input.purpose],
    ["context", input.context],
    ["cta", input.cta],
    ["mustKeep", input.mustKeep],
    ["mustNot", input.mustNot],
  ];
  for (const [fieldId, value] of text) {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) continue;
    answers[projectIntakeServiceFieldKey(CLIP_DOOR_PACKAGE_ID, fieldId)] = trimmed;
  }
  if (input.qualifyingSource) {
    const label = clipCheckboxLabel("qualifyingSource");
    if (label) {
      answers[projectIntakeServiceFieldKey(CLIP_DOOR_PACKAGE_ID, "qualifyingSource")] = label;
    }
  }
  if (input.intelligible) {
    const label = clipCheckboxLabel("intelligible");
    if (label) {
      answers[projectIntakeServiceFieldKey(CLIP_DOOR_PACKAGE_ID, "intelligible")] = label;
    }
  }
  if (input.rightsConfirmed) {
    const label = clipCheckboxLabel("rights");
    if (label) {
      answers[projectIntakeServiceFieldKey(CLIP_DOOR_PACKAGE_ID, "rights")] = label;
    }
  }
  return answers;
}

/** Factory name first, then the current-door name. Does not copy answers. */
export function readClipAuthorizedFact(
  answers: RouteMapIntakeAnswers | null | undefined,
  factoryField: ClipFactoryFactField,
): string {
  const legacy = readProjectIntakeAnswer(answers, factoryField, CLIP_REPURPOSING_SKU);
  if (legacy) return legacy;
  return readProjectIntakeAnswer(
    answers,
    CLIP_DOOR_FACTORY_FIELD_MAP[factoryField],
    CLIP_DOOR_PACKAGE_ID,
  );
}

export const CLIP_RECORDING_NEXT = {
  statusLabel: "Recording needed",
  lead: "Add the recording in My Studio. Your project answers are already saved.",
  actionLabel: "Add the recording",
  href: "/studio-board#sb-materials",
  materialsSupportLine:
    "Add the recording in this section. Your project answers are already saved.",
} as const;

type ClipAnswerCampaign = {
  paymentReceivedAt?: string | null;
  condensedOffer?: { packageId?: string | null } | null;
  routeMapIntake?: { answers?: RouteMapIntakeAnswers | null } | null;
  routeMapIntakeDraft?: { answers?: RouteMapIntakeAnswers | null } | null;
};

/** Paid Clip project whose required answers are already stored. The recording is the remaining request. */
export function clipRepurposingRecordingIsNext(
  campaign: ClipAnswerCampaign | null | undefined,
): boolean {
  if (!campaign?.paymentReceivedAt) return false;
  if (campaign.condensedOffer?.packageId !== CLIP_DOOR_PACKAGE_ID) return false;
  const answers = {
    ...(campaign.routeMapIntakeDraft?.answers ?? {}),
    ...(campaign.routeMapIntake?.answers ?? {}),
  };
  return clipProductionFactsSaved(answers);
}
