/**
 * Smallest durable Creative-Direction Contract.
 * Machine reads this. Production executes it. Quality still judges the MP4.
 * Ordinary-language mapping is a closed phrase table, not a conversation engine.
 */

import type { PackMusicTone } from "@/lib/studio-short-form-content-pack/music-decision";

export type VideoCreativePurpose =
  | "teach"
  | "promote"
  | "personal"
  | "ad"
  | "unknown";

export type VideoBrollTreatment = "none" | "stable_pip" | "short_fullframe";

export type VideoCaptionTreatment = "word_synced_exact" | "larger" | "hidden_box";

export type StudioVideoCreativeDirectionV1 = {
  schemaVersion: 1;
  customerGoal: string;
  intendedAudience: string | null;
  purpose: VideoCreativePurpose;
  spokenIdea: string;
  keep: readonly string[];
  cut: readonly string[];
  broll: {
    use: boolean;
    treatment: VideoBrollTreatment;
    holdThroughSpokenIdea: boolean;
  };
  music: {
    use: boolean;
    tone: PackMusicTone | "omit";
  };
  captions: {
    treatment: VideoCaptionTreatment;
  };
  visualEmphasis: {
    hookPunchIn: boolean;
  };
  cta: {
    text: string | null;
    tightenEnding: boolean;
  };
  customerRevisionInstructions: readonly string[];
};

export type CreativeDirectionPatch = Partial<{
  spokenIdea: string;
  keep: string[];
  cut: string[];
  brollUse: boolean;
  brollTreatment: VideoBrollTreatment;
  holdBrollThroughSpokenIdea: boolean;
  musicUse: boolean;
  captionTreatment: VideoCaptionTreatment;
  ctaText: string;
  tightenEnding: boolean;
}>;

export const ORDINARY_LANGUAGE_DIRECTION_PHRASES = [
  "remove the music",
  "use a different opening",
  "hold the b-roll through this sentence",
  "make the captions bigger",
  "remove b-roll",
  "use a different cta",
  "tighten the ending",
] as const;

export function emptyCreativeDirection(partial?: Partial<StudioVideoCreativeDirectionV1>): StudioVideoCreativeDirectionV1 {
  return {
    schemaVersion: 1,
    customerGoal: "",
    intendedAudience: null,
    purpose: "unknown",
    spokenIdea: "",
    keep: [],
    cut: [],
    broll: { use: true, treatment: "stable_pip", holdThroughSpokenIdea: true },
    music: { use: true, tone: "warm_instructional" },
    captions: { treatment: "word_synced_exact" },
    visualEmphasis: { hookPunchIn: true },
    cta: { text: null, tightenEnding: false },
    customerRevisionInstructions: [],
    ...partial,
  };
}

export function normalizeDirectionPhrase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractReplacementCta(text: string): string | null {
  const match = text.match(
    /(?:use a different cta|change the cta|different cta)[:\s-]+(.+)$/i,
  );
  const raw = match?.[1]?.trim() ?? "";
  if (!raw || normalizeDirectionPhrase(raw) === "use a different cta") return null;
  return raw.replace(/^["']|["']$/g, "").trim() || null;
}

export function mapOrdinaryLanguageToDirectionPatch(
  text: string,
  options?: { replacementCta?: string },
): CreativeDirectionPatch | { ok: false; reason: "unknown_phrase" | "needs_owner_value" } {
  const inlineCta = extractReplacementCta(text);
  const phrase = normalizeDirectionPhrase(text);
  if (phrase === "remove the music") {
    return { musicUse: false };
  }
  if (phrase === "use a different opening") {
    return { cut: ["current_opening"], keep: ["next_complete_thought"] };
  }
  if (phrase === "hold the b-roll through this sentence") {
    return { brollUse: true, holdBrollThroughSpokenIdea: true };
  }
  if (phrase === "make the captions bigger") {
    return { captionTreatment: "larger" };
  }
  if (phrase === "remove b-roll" || phrase === "remove the b-roll") {
    return { brollUse: false, brollTreatment: "none" };
  }
  if (phrase === "use a different cta" || phrase.startsWith("use a different cta ")) {
    const cta = options?.replacementCta?.trim() || inlineCta;
    if (!cta) return { ok: false, reason: "needs_owner_value" };
    return { ctaText: cta };
  }
  if (phrase === "tighten the ending") {
    return { tightenEnding: true };
  }
  return { ok: false, reason: "unknown_phrase" };
}

export function applyCreativeDirectionPatch(
  current: StudioVideoCreativeDirectionV1,
  patch: CreativeDirectionPatch,
): StudioVideoCreativeDirectionV1 {
  return {
    ...current,
    spokenIdea: patch.spokenIdea ?? current.spokenIdea,
    keep: patch.keep ?? current.keep,
    cut: patch.cut ?? current.cut,
    broll: {
      use: patch.brollUse ?? current.broll.use,
      treatment: patch.brollTreatment ?? (patch.brollUse === false ? "none" : current.broll.treatment),
      holdThroughSpokenIdea:
        patch.holdBrollThroughSpokenIdea ?? current.broll.holdThroughSpokenIdea,
    },
    music: {
      use: patch.musicUse ?? current.music.use,
      tone: patch.musicUse === false ? "omit" : current.music.tone,
    },
    captions: {
      treatment: patch.captionTreatment ?? current.captions.treatment,
    },
    cta: {
      text: patch.ctaText ?? current.cta.text,
      tightenEnding: patch.tightenEnding ?? current.cta.tightenEnding,
    },
    customerRevisionInstructions: current.customerRevisionInstructions,
  };
}

export function machineCanExecutePatch(patch: CreativeDirectionPatch): {
  executableNow: boolean;
  missingProductionCapability: string | null;
} {
  if (patch.captionTreatment === "larger") {
    return {
      executableNow: false,
      missingProductionCapability: "caption_scale_control",
    };
  }
  return { executableNow: true, missingProductionCapability: null };
}
