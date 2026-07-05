/** Client-facing copy for Project Record — submitted answers archive. */

export const RECORD_EMPTY_ANSWER = "Not provided yet";
export const RECORD_NO_INFORMATION = "No information provided";
export const RECORD_MISSING_SECTION_TITLE = "Details not provided at submission";

const INTERNAL_EMPTY_VALUES = new Set([
  "na",
  "n/a",
  "null",
  "undefined",
  "not answered",
  "not provided",
  "required",
]);

/** Normalize stored intake values for Project Record display. */
export function formatRecordFieldValue(value: string | null | undefined): string {
  if (value == null) return RECORD_EMPTY_ANSWER;

  const trimmed = value.trim();
  if (!trimmed) return RECORD_EMPTY_ANSWER;

  if (INTERNAL_EMPTY_VALUES.has(trimmed.toLowerCase())) {
    return RECORD_EMPTY_ANSWER;
  }

  return trimmed;
}

export function isRecordEmptyAnswer(value: string): boolean {
  return value === RECORD_EMPTY_ANSWER || value === RECORD_NO_INFORMATION;
}
