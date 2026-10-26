import type { ContentPackIdentifiedClip, ContentPackIntake } from "@/lib/studio-short-form-content-pack/intake";

import {
  emptyCreativeDirection,
  type StudioVideoCreativeDirectionV1,
  type VideoCreativePurpose,
} from "./contract";

function purposeFromFacts(
  intake: ContentPackIntake,
  clip: ContentPackIdentifiedClip,
): VideoCreativePurpose {
  const joined = [
    ...intake.supportedFacts.map((fact) => fact.value),
    ...intake.clips.map((row) => row.label),
    clip.label,
  ]
    .join(" ")
    .toLowerCase();
  if (/\b(ad|promo|promot)\b/.test(joined)) return "promote";
  if (/\b(teach|learn|english|how i)\b/.test(joined)) return "teach";
  return "unknown";
}

function audienceFromFacts(intake: ContentPackIntake): string | null {
  const hit = intake.supportedFacts.find((fact) =>
    /audience|viewer|customer|who/.test(fact.key.toLowerCase()),
  );
  return hit?.value.trim() || null;
}

function goalFromClip(clip: ContentPackIdentifiedClip, intake: ContentPackIntake): string {
  const named = intake.supportedFacts.find((fact) => fact.key === "customer_goal");
  if (named?.value.trim()) return named.value.trim();
  return clip.label.trim();
}

/**
 * Durable job truth from pack intake. First-run defaults keep the certified
 * factory behavior: music on, B-roll optional, punch-in on, exact captions.
 */
export function creativeDirectionFromPackIntake(
  intake: ContentPackIntake,
  clip: ContentPackIdentifiedClip,
): StudioVideoCreativeDirectionV1 {
  return emptyCreativeDirection({
    customerGoal: goalFromClip(clip, intake),
    intendedAudience: audienceFromFacts(intake),
    purpose: purposeFromFacts(intake, clip),
    spokenIdea: clip.label,
    keep: [],
    cut: [],
    broll: { use: true, treatment: "stable_pip", holdThroughSpokenIdea: true },
    music: { use: true, tone: "warm_instructional" },
    captions: { treatment: "word_synced_exact" },
    visualEmphasis: { hookPunchIn: true },
    cta: { text: intake.ctaText, tightenEnding: false },
    customerRevisionInstructions: [],
  });
}

export function creativeDirectionSetFromPackIntake(
  intake: ContentPackIntake,
): StudioVideoCreativeDirectionV1[] {
  return intake.clips.map((clip) => creativeDirectionFromPackIntake(intake, clip));
}
