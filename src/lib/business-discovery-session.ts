import type { DiscoveryTileId } from "@/config/business-discovery-studio";

const STORAGE_KEY = "studio-squishy:business-discovery-answers";

export type DiscoveryAnswers = Partial<Record<DiscoveryTileId, string>>;

export function readDiscoveryAnswers(): DiscoveryAnswers {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as DiscoveryAnswers;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDiscoveryAnswers(answers: DiscoveryAnswers): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
}
