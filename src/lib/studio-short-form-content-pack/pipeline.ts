import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { studioShortFormContentPackFactoryV1 as pack } from "@/config/studio-short-form-content-pack-factory-v1";
import { FLAGSHIP_UPBEAT_BED_REL } from "@/lib/studio-flagship-short-form-edit/music";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";

import { clipCorrectionFromDirection } from "@/lib/studio-video-creative-direction/apply-to-production";
import { creativeDirectionFromPackIntake } from "@/lib/studio-video-creative-direction/from-intake";
import type { StudioVideoCreativeDirectionV1 } from "@/lib/studio-video-creative-direction/contract";
import { routeOrdinaryLanguageToMachine } from "@/lib/studio-video-creative-direction/machine-route";

import { replacePackCtaCard } from "./apply-cta-revision";
import { runContentPackClip, type PackClipResult } from "./clip";
import { paintPackCover, type PackCover } from "./covers";
import {
  renderUseGuideMarkdown,
  writePackPostCaption,
  writePackUseGuide,
  type PackPostCaption,
  type PackUseGuide,
} from "./extras";
import {
  evaluateContentPackIntake,
  type ContentPackIntake,
} from "./intake";
import { decidePackMusic } from "./music-decision";
import {
  emptyPackRevisionLedger,
  evaluatePackRevision,
  type ContentPackRevisionLedger,
  type ContentPackRevisionRequest,
} from "./revision";

export type ContentPackSpend = {
  deepgramUsd: number;
  elevenCredits: number;
  stockMediaUsd: number;
  modelSelectionUsd: 0;
  shotstackRenders: 0;
  elapsedMs: number;
  ownerRoutineLaborRequired: false;
  manualIntervention: string[];
};

export type ContentPackFactoryResult = {
  ok: true;
  clips: PackClipResult[];
  postCaptions: PackPostCaption[];
  covers: PackCover[];
  useGuide: PackUseGuide;
  useGuideRelativePath: string;
  revisionLedger: ContentPackRevisionLedger;
  musicDecision: ReturnType<typeof decidePackMusic>;
  deliveryRelativePath: string;
  creativeDirection: StudioVideoCreativeDirectionV1[];
  spend: ContentPackSpend;
};

function isPackPostCaption(
  value: PackPostCaption | { ok: false; message: string },
): value is PackPostCaption {
  return !("ok" in value && value.ok === false);
}

export async function runContentPackFactory(input: {
  repoRoot: string;
  intake: ContentPackIntake;
  sourceAbsolutePath: string;
  stampDir?: string;
}): Promise<ContentPackFactoryResult | { ok: false; message: string }> {
  const startedAt = Date.now();
  applyDotenvLocal(input.repoRoot);
  const blocked = evaluateContentPackIntake(input.intake);
  if (blocked) return blocked;
  const stampDir = input.stampDir ?? pack.stampDir;
  const deliveryDir = path.join(input.repoRoot, stampDir, "delivery");
  mkdirSync(deliveryDir, { recursive: true });

  const musicDecision = decidePackMusic({
    spokenIdeas: input.intake.clips.map((clip) => clip.label),
    coordinatedSet: true,
  });
  const sharedBed = path.join(input.repoRoot, FLAGSHIP_UPBEAT_BED_REL);

  const clips: PackClipResult[] = [];
  const spend: ContentPackSpend = {
    deepgramUsd: 0,
    elevenCredits: 0,
    stockMediaUsd: 0,
    modelSelectionUsd: 0,
    shotstackRenders: 0,
    elapsedMs: 0,
    ownerRoutineLaborRequired: false,
    manualIntervention: [],
  };

  const creativeDirection = input.intake.clips.map((clip) =>
    creativeDirectionFromPackIntake(input.intake, clip),
  );

  for (const [index, clip] of input.intake.clips.entries()) {
    const direction = creativeDirection[index];
    const result = await runContentPackClip({
      repoRoot: input.repoRoot,
      workDir: path.join(input.repoRoot, stampDir, "work", clip.id),
      outputRelativePath: `${stampDir}/delivery/${clip.id}.mp4`,
      sourceAbsolutePath: input.sourceAbsolutePath,
      clip,
      ctaText: direction.cta.text ?? input.intake.ctaText,
      musicDecision,
      sharedMusicAbsolutePath:
        musicDecision.mode === "shared_set_bed" ? sharedBed : null,
      direction,
      correction: clipCorrectionFromDirection(direction),
    });
    if (!result.ok) return result;
    clips.push(result);
    spend.deepgramUsd += result.spend.deepgramUsd;
    spend.elevenCredits += result.spend.elevenCredits;
    spend.stockMediaUsd += result.spend.stockMediaUsd;
  }

  const postCaptions: PackPostCaption[] = [];
  for (const clip of clips) {
    const caption = writePackPostCaption({
      clipId: clip.clipId,
      spokenIdea: clip.spokenIdea,
      facts: input.intake.supportedFacts,
      ctaText: input.intake.ctaText,
    });
    if ("ok" in caption && caption.ok === false) return caption;
    postCaptions.push(caption as PackPostCaption);
  }

  const covers: PackCover[] = [];
  for (const [index, clip] of clips.entries()) {
    const coverAbs = path.join(deliveryDir, `${clip.clipId}-cover.png`);
    const cover = await paintPackCover({
      clipId: clip.clipId,
      title: clip.label,
      supportingLine: clip.spokenIdea.trim(),
      setIndex: index + 1,
      setCount: clips.length,
      outputAbsolutePath: coverAbs,
    });
    if ("ok" in cover && cover.ok === false) return cover;
    const painted = cover as PackCover;
    painted.relativePath = `${stampDir}/delivery/${clip.clipId}-cover.png`;
    covers.push(painted);
  }

  const useGuide = writePackUseGuide({
    clipLabels: clips.map((clip) => ({
      clipId: clip.clipId,
      label: clip.label,
      spokenIdea: clip.spokenIdea,
    })),
    ctaText: input.intake.ctaText,
  });
  if ("ok" in useGuide && useGuide.ok === false) return useGuide;
  const guide = useGuide as PackUseGuide;
  const useGuideRelativePath = `${stampDir}/delivery/use-guide.md`;
  writeFileSync(
    path.join(input.repoRoot, useGuideRelativePath),
    renderUseGuideMarkdown(guide),
  );

  spend.elapsedMs = Date.now() - startedAt;
  const result: ContentPackFactoryResult = {
    ok: true,
    clips,
    postCaptions,
    covers,
    useGuide: guide,
    useGuideRelativePath,
    revisionLedger: emptyPackRevisionLedger(),
    musicDecision,
    deliveryRelativePath: `${stampDir}/delivery`,
    creativeDirection,
    spend,
  };
  writeFileSync(
    path.join(deliveryDir, "creative-direction.json"),
    `${JSON.stringify(creativeDirection, null, 2)}\n`,
  );
  writeFileSync(
    path.join(deliveryDir, "pack-manifest.json"),
    `${JSON.stringify(
      {
        ...result,
        publicCatalogSwitched: pack.publicCatalogSwitched,
        doNotStartClip: pack.doNotStartClip,
      },
      null,
      2,
    )}\n`,
  );
  return result;
}

export async function applyContentPackSetRevision(input: {
  repoRoot: string;
  pack: ContentPackFactoryResult;
  request: ContentPackRevisionRequest;
  stampDir?: string;
}): Promise<
  | { ok: true; pack: ContentPackFactoryResult }
  | { ok: false; message: string; revisionLimitReached?: boolean }
> {
  const allowed = evaluatePackRevision(input.pack.revisionLedger, input.request);
  if (!allowed.ok) {
    return {
      ok: false,
      message: allowed.message,
      revisionLimitReached: allowed.code === "REVISION_EXHAUSTED",
    };
  }
  if (input.request.kind !== "change_set_cta" || !input.request.nextCtaText) {
    return {
      ok: false,
      message: "This certification path proves one set CTA revision.",
    };
  }
  const stampDir = input.stampDir ?? pack.stampDir;
  const nextClips = [...input.pack.clips];
  for (const [index, clip] of nextClips.entries()) {
    const sourceAbs = path.join(input.repoRoot, clip.outputRelativePath);
    const outputRel = `${stampDir}/delivery/${clip.clipId}-revised.mp4`;
    const replaced = await replacePackCtaCard({
      repoRoot: input.repoRoot,
      videoAbsolutePath: sourceAbs,
      outputAbsolutePath: path.join(input.repoRoot, outputRel),
      workDirectory: path.join(input.repoRoot, stampDir, "work", `${clip.clipId}-cta-revision`),
      nextCtaText: input.request.nextCtaText,
    });
    if (!replaced.ok) return replaced;
    nextClips[index] = {
      ...clip,
      outputRelativePath: outputRel,
      inspect: replaced.inspect,
    };
  }
  const revised: ContentPackFactoryResult = {
    ...input.pack,
    clips: nextClips,
    postCaptions: input.pack.clips.map((clip) => {
      const caption = writePackPostCaption({
        clipId: clip.clipId,
        spokenIdea: clip.spokenIdea,
        facts: [],
        ctaText: input.request.nextCtaText ?? "",
      });
      return isPackPostCaption(caption)
        ? caption
        : { clipId: clip.clipId, text: `${clip.spokenIdea.trim()}\n\n${input.request.nextCtaText}`, usedFactKeys: [] };
    }),
    revisionLedger: allowed.nextLedger,
    creativeDirection: (input.pack.creativeDirection ?? []).map((direction) => ({
      ...direction,
      cta: { ...direction.cta, text: input.request.nextCtaText ?? direction.cta.text },
    })),
  };
  const revisedGuide = writePackUseGuide({
    clipLabels: nextClips.map((clip) => ({
      clipId: clip.clipId,
      label: clip.label,
      spokenIdea: clip.spokenIdea,
    })),
    ctaText: input.request.nextCtaText,
  });
  if ("ok" in revisedGuide && revisedGuide.ok === false) return revisedGuide;
  revised.useGuide = revisedGuide as PackUseGuide;
  writeFileSync(
    path.join(input.repoRoot, stampDir, "delivery", "use-guide.md"),
    renderUseGuideMarkdown(revised.useGuide),
  );
  writeFileSync(
    path.join(input.repoRoot, stampDir, "delivery", "pack-manifest-revised.json"),
    `${JSON.stringify(revised, null, 2)}\n`,
  );
  return { ok: true, pack: revised };
}

export async function applyOrdinaryLanguageDirectionRevision(input: {
  repoRoot: string;
  pack: ContentPackFactoryResult;
  text: string;
  replacementCta?: string;
  clipId?: string;
  stampDir?: string;
}): Promise<
  | {
      ok: true;
      pack: ContentPackFactoryResult;
      decision: ReturnType<typeof routeOrdinaryLanguageToMachine>;
      qualityRewatchedRenderedMp4: boolean;
    }
  | {
      ok: false;
      failClosed: true;
      message: string;
      reason: "unknown_phrase" | "needs_cta_wording" | "not_executable";
      detail: string;
      escalate: "none" | "scout";
    }
> {
  const current =
    input.pack.creativeDirection?.find(
      (direction, index) =>
        input.clipId
          ? input.pack.clips[index]?.clipId === input.clipId
          : index === 0,
    ) ?? input.pack.creativeDirection?.[0];
  if (!current) {
    return {
      ok: false,
      failClosed: true,
      reason: "unknown_phrase",
      escalate: "none",
      detail: "No Creative-Direction Contract is attached to this pack.",
      message: "No Creative-Direction Contract is attached to this pack.",
    };
  }
  const decision = routeOrdinaryLanguageToMachine({
    current,
    text: input.text,
    replacementCta: input.replacementCta,
  });
  if (decision.route === "fail_closed") {
    return {
      ok: false,
      failClosed: true,
      reason: decision.reason,
      detail: decision.detail,
      escalate: decision.escalate,
      message: decision.detail,
    };
  }

  const stampDir = input.stampDir ?? pack.stampDir;
  const nextDirection = input.pack.creativeDirection.map((direction, index) => {
    const clipId = input.pack.clips[index]?.clipId;
    if (input.clipId && clipId !== input.clipId) return direction;
    return decision.nextDirection;
  });

  let nextClips = [...input.pack.clips];
  let qualityRewatchedRenderedMp4 = false;
  if (decision.patch.ctaText) {
    for (const [index, clip] of nextClips.entries()) {
      if (input.clipId && clip.clipId !== input.clipId) continue;
      const sourceAbs = path.join(input.repoRoot, clip.outputRelativePath);
      const outputRel = `${stampDir}/delivery/${clip.clipId}-direction-cta.mp4`;
      const replaced = await replacePackCtaCard({
        repoRoot: input.repoRoot,
        videoAbsolutePath: sourceAbs,
        outputAbsolutePath: path.join(input.repoRoot, outputRel),
        workDirectory: path.join(
          input.repoRoot,
          stampDir,
          "work",
          `${clip.clipId}-direction-cta`,
        ),
        nextCtaText: decision.patch.ctaText,
      });
      if (!replaced.ok) {
        return {
          ok: false,
          failClosed: true,
          reason: "not_executable",
          escalate: "scout",
          detail: replaced.message,
          message: replaced.message,
        };
      }
      nextClips[index] = {
        ...clip,
        outputRelativePath: outputRel,
        inspect: replaced.inspect,
      };
      qualityRewatchedRenderedMp4 = true;
    }
  }

  const nextPack: ContentPackFactoryResult = {
    ...input.pack,
    clips: nextClips,
    creativeDirection: nextDirection,
  };
  writeFileSync(
    path.join(input.repoRoot, stampDir, "delivery", "creative-direction.json"),
    `${JSON.stringify(nextDirection, null, 2)}\n`,
  );
  return { ok: true, pack: nextPack, decision, qualityRewatchedRenderedMp4 };
}
