/**
 * Honest materials / reference path for schema Intake fields (Package 3).
 * Customers describe references or state they do not have files yet —
 * these fields never store uploaded files.
 */

export const INTAKE_MATERIALS_HAVE_NOW = "I can describe what I have";
export const INTAKE_MATERIALS_NONE_YET = "I do not have this yet";
export const INTAKE_MATERIALS_PROVIDE_LATER = "I will provide this later";

export const INTAKE_MATERIALS_AVAILABILITY_OPTIONS = [
  INTAKE_MATERIALS_HAVE_NOW,
  INTAKE_MATERIALS_NONE_YET,
  INTAKE_MATERIALS_PROVIDE_LATER,
] as const;

export type IntakeMaterialsAvailability =
  (typeof INTAKE_MATERIALS_AVAILABILITY_OPTIONS)[number];

export type ParsedMaterialsPathAnswer = {
  availability: IntakeMaterialsAvailability | "";
  detail: string;
};

export function parseMaterialsPathAnswer(raw: string | undefined): ParsedMaterialsPathAnswer {
  const value = String(raw ?? "").trim();
  if (!value) return { availability: "", detail: "" };
  if (value === INTAKE_MATERIALS_NONE_YET) {
    return { availability: INTAKE_MATERIALS_NONE_YET, detail: "" };
  }
  if (value === INTAKE_MATERIALS_PROVIDE_LATER) {
    return { availability: INTAKE_MATERIALS_PROVIDE_LATER, detail: "" };
  }
  return { availability: INTAKE_MATERIALS_HAVE_NOW, detail: value };
}

/** Flatten availability + optional detail into one draft/submit answer string. */
export function buildMaterialsPathAnswer(
  availability: string,
  detail: string,
): string {
  if (availability === INTAKE_MATERIALS_NONE_YET) return INTAKE_MATERIALS_NONE_YET;
  if (availability === INTAKE_MATERIALS_PROVIDE_LATER) return INTAKE_MATERIALS_PROVIDE_LATER;
  if (availability === INTAKE_MATERIALS_HAVE_NOW) return detail.trim();
  return "";
}

export function isMaterialsPathAnswerComplete(
  availability: string,
  detail: string,
  required: boolean,
): boolean {
  if (!required && !availability) return true;
  if (!availability) return false;
  if (availability === INTAKE_MATERIALS_HAVE_NOW) return detail.trim().length > 0;
  return (
    availability === INTAKE_MATERIALS_NONE_YET ||
    availability === INTAKE_MATERIALS_PROVIDE_LATER
  );
}
