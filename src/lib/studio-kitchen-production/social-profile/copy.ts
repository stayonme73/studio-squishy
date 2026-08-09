import { FACEBOOK_ABOUT_MAX_CHARS } from "./capability";

/** Adapters must never silently shorten approved copy — reject and return to copy. */
export function assertNoSilentTruncation(
  value: string,
  errors: string[],
  label: string,
): void {
  if (/\uFFFD/.test(value)) {
    errors.push(`${label} contains replacement characters — copy corrupt`);
  }
}

export function facebookAboutFits(value: string): boolean {
  return [...value].length <= FACEBOOK_ABOUT_MAX_CHARS;
}

export function copyLimitConflict(
  platform: "facebook" | "instagram" | "tiktok",
  field: string,
  value: string,
): { ok: true } | { ok: false; action: "return_to_copy_correction"; detail: string } {
  if (platform === "facebook" && field === "about" && !facebookAboutFits(value)) {
    return {
      ok: false,
      action: "return_to_copy_correction",
      detail: `Facebook about max ${FACEBOOK_ABOUT_MAX_CHARS} characters — do not truncate in adapter`,
    };
  }
  return { ok: true };
}
