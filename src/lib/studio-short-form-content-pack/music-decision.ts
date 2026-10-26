export type PackMusicTone =
  | "upbeat_conversational"
  | "warm_instructional"
  | "quiet_no_music";

export type PackMusicDecision =
  | {
      mode: "shared_set_bed";
      reason: string;
      tone: PackMusicTone;
    }
  | {
      mode: "per_clip";
      reason: string;
    }
  | {
      mode: "omit";
      reason: string;
    };

export function classifyPackClipTone(spokenIdea: string): PackMusicTone {
  const text = spokenIdea.toLowerCase();
  if (/memorial|funeral|grief| condolence|passed away/.test(text)) {
    return "quiet_no_music";
  }
  if (/teach|learn|learning|phrase|school|parents|language|english/.test(text)) {
    return "warm_instructional";
  }
  return "upbeat_conversational";
}

export function decidePackMusic(input: {
  spokenIdeas: readonly string[];
  coordinatedSet: boolean;
}): PackMusicDecision {
  const tones = input.spokenIdeas.map(classifyPackClipTone);
  if (tones.some((tone) => tone === "quiet_no_music")) {
    return {
      mode: "omit",
      reason: "At least one clip would be harmed by a bed. Music stays off.",
    };
  }
  const unique = new Set(tones);
  if (input.coordinatedSet && unique.size === 1) {
    return {
      mode: "shared_set_bed",
      tone: tones[0] ?? "upbeat_conversational",
      reason:
        "These clips are one coordinated set and share one tone. One bed may cover the set.",
    };
  }
  if (input.coordinatedSet && unique.size === 2) {
    const compatible =
      unique.has("upbeat_conversational") && unique.has("warm_instructional");
    if (compatible) {
      return {
        mode: "shared_set_bed",
        tone: "warm_instructional",
        reason:
          "Same speaker and campaign. Conversational and instructional tones can share one warm bed.",
      };
    }
  }
  return {
    mode: "per_clip",
    reason:
      "The clips are not one musical set. Mint or select a bed that fits each clip.",
  };
}

export function musicPromptForTone(tone: PackMusicTone, spokenIdea: string): string {
  const idea = spokenIdea.slice(0, 140);
  if (tone === "quiet_no_music") {
    return "";
  }
  if (tone === "warm_instructional") {
    return `Original instrumental bed under a warm person teaching a short English idea: ${idea}. Light, adult, conversational, gently bright. Soft acoustic guitar or warm keys. Not memorial, not corporate, not childish, not trailer, no vocals, no lyrics, no recognizable melody. Stay underneath speech.`;
  }
  return `Original instrumental bed under an upbeat person talking to camera: ${idea}. Light, warm, positive, conversational bounce. Soft acoustic guitar or bright keys. Adult, not childish, not corporate, not cheesy, not sentimental, not dramatic, not memorial. No choir, no vocals, no lyrics, no recognizable melody. Stay underneath speech.`;
}
