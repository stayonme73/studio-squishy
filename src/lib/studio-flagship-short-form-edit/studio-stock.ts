/**
 * Studio-sourced B-roll: pinned Pexels catalog, not live search.
 * Object-only clips after visual inspect. No people. No decorative inserts.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import {
  evaluateFlagshipBroll,
  type FlagshipBrollAsset,
} from "./broll";

export const PEXELS_LICENSE_URL = "https://www.pexels.com/license/" as const;

export type StudioStockKind = "video" | "still";

export type ApprovedStudioStockEntry = {
  id: string;
  provider: "pexels";
  kind: StudioStockKind;
  pageUrl: string;
  downloadUrl: string;
  creator: string;
  title: string;
  storyTokens: readonly string[];
  noIdentifiablePeople: true;
  avoidTrademarks: true;
  inspected: true;
  notes: string;
};

/**
 * Pinned after frame inspect. Classroom / children / identifiable-face
 * clips were rejected and must not be added here.
 */
export const APPROVED_STUDIO_STOCK: readonly ApprovedStudioStockEntry[] = [
  {
    id: "pexels-1307111",
    provider: "pexels",
    kind: "video",
    pageUrl: "https://www.pexels.com/video/close-up-video-of-cherries-1307111/",
    downloadUrl:
      "https://videos.pexels.com/video-files/1307111/1307111-hd_1920_1080_30fps.mp4",
    creator: "Zuzanna Musial",
    title: "Close-up of ripe cherries on a branch",
    storyTokens: ["cherry", "cherries", "fruit"],
    noIdentifiablePeople: true,
    avoidTrademarks: true,
    inspected: true,
    notes: "Object-only fruit. Supports a spoken cherries / fruit line.",
  },
  {
    id: "pexels-267669",
    provider: "pexels",
    kind: "still",
    pageUrl: "https://www.pexels.com/photo/close-up-of-dictionary-267669/",
    downloadUrl:
      "https://images.pexels.com/photos/267669/pexels-photo-267669.jpeg?auto=compress&cs=tinysrgb&w=1280",
    creator: "Pixabay",
    title: "English dictionary entry for dictionary",
    storyTokens: [
      "english",
      "learn",
      "learning",
      "language",
      "phrase",
      "phrases",
      "teach",
      "teaching",
      "vocabulary",
      "dictionary",
    ],
    noIdentifiablePeople: true,
    avoidTrademarks: true,
    inspected: true,
    notes:
      "Object-only English dictionary page. The headword and English definitions are readable. Replaces generic open-book pages that only said book.",
  },
] as const;

export type StudioStockProvenance = {
  schemaVersion: 1;
  provider: "pexels";
  license: "Pexels License";
  licenseUrl: typeof PEXELS_LICENSE_URL;
  commercialUse: true;
  attributionRequired: false;
  standaloneRedistributionForbidden: true;
  doNotSellUnaltered: true;
  noImpliedEndorsement: true;
  noIdentifiablePeopleInSensitiveUse: true;
  usedOnlyInsideFinishedEdit: true;
  entryId: string;
  pageUrl: string;
  downloadUrl: string;
  creator: string;
  title: string;
  kind: StudioStockKind;
  downloadedAt: string;
  costUsd: 0;
};

const GENERIC_STORY_TOKENS = new Set([
  "english",
  "learn",
  "learning",
  "language",
  "phrase",
  "phrases",
  "teach",
  "teaching",
  "vocabulary",
  "dictionary",
]);

function scoreStoryMatch(spokenIdea: string, tokens: readonly string[]): number {
  const idea = spokenIdea.toLowerCase();
  let specific = 0;
  let generic = 0;
  for (const token of tokens) {
    const needle = token.toLowerCase();
    if (!idea.includes(needle)) continue;
    if (GENERIC_STORY_TOKENS.has(needle)) generic += token.length;
    else specific += token.length * 4;
  }
  return specific > 0 ? specific : generic;
}

export function pickApprovedStudioStock(
  spokenIdea: string,
): ApprovedStudioStockEntry | null {
  let best: ApprovedStudioStockEntry | null = null;
  let bestScore = 0;
  for (const entry of APPROVED_STUDIO_STOCK) {
    const score = scoreStoryMatch(spokenIdea, entry.storyTokens);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

export async function ensureApprovedStudioStockFile(input: {
  repoRoot: string;
  entry: ApprovedStudioStockEntry;
}): Promise<
  | { ok: true; absolutePath: string; relativePath: string; provenance: StudioStockProvenance }
  | { ok: false; message: string }
> {
  const ext = input.entry.kind === "video" ? "mp4" : "jpg";
  const relativePath =
    `docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/broll/catalog/${input.entry.id}.${ext}`;
  const absolutePath = path.join(input.repoRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  if (!existsSync(absolutePath)) {
    try {
      const response = await fetch(input.entry.downloadUrl);
      if (!response.ok) {
        return {
          ok: false,
          message: `Pexels download HTTP ${response.status} for ${input.entry.id}`,
        };
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 20_000) {
        return { ok: false, message: `Pexels payload too small for ${input.entry.id}` };
      }
      writeFileSync(absolutePath, bytes);
    } catch (error) {
      return {
        ok: false,
        message: `Pexels download failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
  const provenance: StudioStockProvenance = {
    schemaVersion: 1,
    provider: "pexels",
    license: "Pexels License",
    licenseUrl: PEXELS_LICENSE_URL,
    commercialUse: true,
    attributionRequired: false,
    standaloneRedistributionForbidden: true,
    doNotSellUnaltered: true,
    noImpliedEndorsement: true,
    noIdentifiablePeopleInSensitiveUse: true,
    usedOnlyInsideFinishedEdit: true,
    entryId: input.entry.id,
    pageUrl: input.entry.pageUrl,
    downloadUrl: input.entry.downloadUrl,
    creator: input.entry.creator,
    title: input.entry.title,
    kind: input.entry.kind,
    downloadedAt: new Date().toISOString(),
    costUsd: 0,
  };
  writeFileSync(
    `${absolutePath}.provenance.json`,
    `${JSON.stringify(provenance, null, 2)}\n`,
  );
  return { ok: true, absolutePath, relativePath, provenance };
}

export async function resolveStudioSourcedBroll(input: {
  repoRoot: string;
  spokenIdea: string;
}): Promise<
  | { ok: true; use: false; reason: string }
  | { ok: true; use: true; asset: FlagshipBrollAsset; provenance: StudioStockProvenance }
  | { ok: false; message: string }
> {
  const entry = pickApprovedStudioStock(input.spokenIdea);
  if (!entry) {
    return {
      ok: true,
      use: false,
      reason: "No approved Studio stock matches the spoken line. Talking-head stays.",
    };
  }
  const file = await ensureApprovedStudioStockFile({
    repoRoot: input.repoRoot,
    entry,
  });
  if (!file.ok) return file;
  const asset: FlagshipBrollAsset = {
    absolutePath: file.absolutePath,
    rightsCleared: true,
    customerOwnsOrHasPermission: false,
    studioLicensed: true,
    source: "studio_pexels",
    mediaKind: entry.kind,
    supportsSpokenIdea: entry.storyTokens.join(" "),
  };
  const evaluated = evaluateFlagshipBroll({
    asset,
    spokenIdea: input.spokenIdea,
  });
  if (!evaluated.ok) return evaluated;
  if (!evaluated.use) {
    return { ok: true, use: false, reason: evaluated.reason };
  }
  return { ok: true, use: true, asset, provenance: file.provenance };
}
