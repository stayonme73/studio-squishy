import type { DraftIntakePayload } from "@/config/draft-room";
import { EMPTY_DRAFT_INTAKE_FORM } from "@/config/draft-room";
import { normalizeDraftIntakePayload } from "@/lib/campaign-vision";
import { upsertCampaignFromIntake } from "@/lib/studio-board-campaign";

export { IntakeLockedError } from "@/lib/studio-board-campaign";

const STORAGE_KEY = "studio-squishy:last-draft";

/** Persist locally until API wiring — Studio Board can read this later. */
export function saveDraftIntakeLocally(payload: DraftIntakePayload) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readLastDraftIntake(): DraftIntakePayload | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return normalizeDraftIntakePayload(JSON.parse(raw) as DraftIntakePayload);
  } catch {
    return null;
  }
}

/**
 * Submit intake — local save now; replace body with fetch() when API is ready.
 */
export async function submitDraftIntake(payload: DraftIntakePayload): Promise<void> {
  const normalized = normalizeDraftIntakePayload(payload);
  saveDraftIntakeLocally(normalized);
  upsertCampaignFromIntake(normalized);
  // TODO: POST to intake API / email service
}
