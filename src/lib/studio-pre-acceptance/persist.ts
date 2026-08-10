import { studioPreAcceptanceV1 } from "@/config/studio-pre-acceptance-v1";

import type { PreAcceptanceDecision } from "./types";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function persistPreAcceptanceDecision(
  decision: PreAcceptanceDecision,
): void {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.setItem(
      studioPreAcceptanceV1.storageKey,
      JSON.stringify(decision),
    );
  } catch {
    // Fail closed on persist errors — payment gate re-evaluates from facts.
  }
}

export function readPersistedPreAcceptanceDecision(): PreAcceptanceDecision | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(studioPreAcceptanceV1.storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PreAcceptanceDecision;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.decisionId !== "string") return null;
    if (typeof parsed.outcome !== "string") return null;
    if (typeof parsed.factFingerprint !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPersistedPreAcceptanceDecision(): void {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.removeItem(studioPreAcceptanceV1.storageKey);
  } catch {
    // ignore
  }
}
