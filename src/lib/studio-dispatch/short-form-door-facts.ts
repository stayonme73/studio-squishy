/**
 * Read current-door Short-Form facts in the shape the existing footage factory expects.
 * Does not write a second intake record and does not reuse Clip field names.
 */

import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import type { RouteMapIntakeAnswers } from "@/catalog/intake";
import { readProjectIntakeAnswer } from "@/lib/project-intake-plan";

export const SHORT_FORM_DOOR_PACKAGE_ID = "short_form_video_editing" as const;

/** Factory field → the one current-door field that already holds that fact. */
export const SHORT_FORM_DOOR_FACTORY_FIELD_MAP = {
  videoPurpose: "purpose",
  talkingHeadConfirm: "markedMoments",
  rightsAcknowledgement: "rights",
  ctaText: "cta",
  mustKeepLine: "mustKeep",
} as const;

export type ShortFormFactoryFactField = keyof typeof SHORT_FORM_DOOR_FACTORY_FIELD_MAP;

/** Factory name first, then the current-door name. Does not copy answers. */
export function readShortFormAuthorizedFact(
  answers: RouteMapIntakeAnswers | null | undefined,
  factoryField: ShortFormFactoryFactField,
): string {
  const legacy = readProjectIntakeAnswer(
    answers,
    factoryField,
    SHORT_FORM_VIDEO_EDITING_SKU,
  );
  if (legacy) return legacy;
  return readProjectIntakeAnswer(
    answers,
    SHORT_FORM_DOOR_FACTORY_FIELD_MAP[factoryField],
    SHORT_FORM_DOOR_PACKAGE_ID,
  );
}

export function shortFormDoorUsableFootage(
  answers: RouteMapIntakeAnswers | null | undefined,
): string {
  return readProjectIntakeAnswer(
    answers,
    "usableFootage",
    SHORT_FORM_DOOR_PACKAGE_ID,
  );
}
