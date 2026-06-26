import type { DiscoveryTileId } from "@/config/business-discovery-studio";
import { coerceDiscoveryAnswerValue } from "@/lib/business-discovery-completion";

const STORAGE_KEY = "studio-squishy:business-discovery-answers";

export type DiscoveryAnswers = Partial<Record<DiscoveryTileId, string>>;

function sanitizeDiscoveryAnswers(parsed: unknown): DiscoveryAnswers {
  if (typeof parsed !== "object" || parsed === null) return {};

  const answers: DiscoveryAnswers = {};
  for (const [tileId, value] of Object.entries(parsed)) {
    const coerced = coerceDiscoveryAnswerValue(value);
    if (coerced) {
      answers[tileId as DiscoveryTileId] = coerced;
    }
  }
  return answers;
}

export function readDiscoveryAnswers(): DiscoveryAnswers {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return sanitizeDiscoveryAnswers(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveDiscoveryAnswers(answers: DiscoveryAnswers): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
}

/** Dev reset — drop saved discovery answers from this browser. */
export function clearDiscoveryAnswers(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
