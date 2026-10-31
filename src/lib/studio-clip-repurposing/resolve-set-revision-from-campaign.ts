/**
 * Map one included Clip Repurposing set revision from stored customer emphasis.
 * Supported package types: swap_clip, approved_cta_change, end_card_hold_adjustment.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { buildTranscriptSentences } from "@/lib/studio-short-form-video-editing/sentences";

import { mapClipRepurposingJobTruthFromJob } from "@/lib/studio-dispatch/map-clip-repurposing-job-truth";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { applySetRevision, discoverClipSet } from "./set-discovery";
import type { SetRevision } from "./types";

const SWAP_RE =
  /\b(swap|replace|alternate|different clip|another clip|switch (?:out|the))\b/i;
const CTA_RE =
  /\b(cta|call to action|end[- ]?card text|button text|closing text)\b/i;
const HOLD_RE =
  /\b(end[- ]?card|hold|beat|pause|linger|one beat|half beat|trim the hold)\b/i;

function clipFactoryTranscriptPath(repoRoot: string, campaignId: string): string {
  return path.join(
    repoRoot,
    "data/campaign-design-artifacts",
    campaignId,
    "clip-factory",
    "transcript-words.json",
  );
}

export function resolveClipRepurposingSetRevisionFromCampaign(input: {
  campaign: CampaignRecord;
  materials?: readonly CampaignMaterialItem[];
  repoRoot?: string;
  instructionOverride?: string;
}): SetRevision | null {
  const instruction =
    input.instructionOverride?.trim() ||
    input.campaign.machineFlyerRevisionEmphasis?.instruction?.trim() ||
    "";
  if (!instruction) return null;

  if (SWAP_RE.test(instruction)) {
    const repoRoot = input.repoRoot?.trim();
    if (!repoRoot) return null;
    const transcriptAbs = clipFactoryTranscriptPath(repoRoot, input.campaign.campaignId);
    if (!existsSync(transcriptAbs)) return null;
    const saved = JSON.parse(readFileSync(transcriptAbs, "utf8")) as {
      durationSeconds: number;
      words: Array<{ start: number; end: number; word: string }>;
    };
    const discovered = discoverClipSet({
      sourceDurationSeconds: saved.durationSeconds,
      sentences: buildTranscriptSentences(saved.words as never),
    });
    if (!discovered.ok) return null;
    const remove = discovered.selected[discovered.selected.length - 1];
    const add = discovered.alternates[0];
    if (!remove || !add) return null;
    const revised = applySetRevision(discovered, {
      kind: "swap_clip",
      removeId: remove.id,
      addId: add.id,
    });
    if (!revised.ok) return null;
    return { kind: "swap_clip", removeId: remove.id, addId: add.id };
  }

  if (CTA_RE.test(instruction)) {
    const truth = mapClipRepurposingJobTruthFromJob({
      repoRoot: input.repoRoot ?? process.cwd(),
      campaign: input.campaign,
      materials: input.materials ?? [],
    });
    if (!truth.ok) return null;
    const ctaText = truth.intake.ctaText?.trim();
    if (!ctaText) return null;
    return { kind: "cta_change", ctaText };
  }

  if (HOLD_RE.test(instruction)) {
    const numeric = instruction.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|second)/i);
    const holdSeconds = numeric ? Number(numeric[1]) : 0.9;
    return { kind: "end_card_hold", holdSeconds };
  }

  return { kind: "end_card_hold", holdSeconds: 0.9 };
}
