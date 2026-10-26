/**
 * Owner unusual-cert correction 2: stable opening by default,
 * Clip 3 approved sting a little more present, keep c-50-377.
 */

import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { FLAGSHIP_UPBEAT_BED_REL } from "@/lib/studio-flagship-short-form-edit/music";
import { runContentPackClip } from "@/lib/studio-short-form-content-pack/clip";
import { decidePackMusic } from "@/lib/studio-short-form-content-pack/music-decision";
import { reviewRenderedShort } from "@/lib/studio-short-form-content-pack/quality-review";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { readDeepgramApiKey } from "@/lib/studio-short-form-video-editing/deepgram";

import { identifiedClipFromCandidate } from "./finishing";
import { CLIP_549_LIVE_CTA } from "./live-five-e2e";
import { DESIGNATED_CLIP_SOURCE_REL, discoverDesignatedClipSource } from "./probe-designated-source";

export const CLIP_549_OWNER_CERT_CORRECTION_STAMP =
  "docs/launch/studio-549-clip-repurposing-build-1/owner-cert-stable-open" as const;

const FINAL_IDS = ["c-56-423", "c-17-127", "c-82-641", "c-97-723", "c-50-377"] as const;

/** Include “worth posting.” Discovery window ended on “be...” */
const CLIP4_END_SECONDS = 746.85;

/** Same sting identity as the $349 approval. +3 dB from the current −3 mix. */
const CLIP3_CUE_MIX_DB = 0;

export async function runClip549OwnerCertCorrection(repoRoot: string) {
  applyDotenvLocal(repoRoot);
  if (!readDeepgramApiKey()) {
    return { ok: false as const, message: "DEEPGRAM_API_KEY absent." };
  }
  const { discovery } = discoverDesignatedClipSource(repoRoot);
  const ranked = [...discovery.selected, ...discovery.alternates];
  const selected = FINAL_IDS.map((id) => ranked.find((clip) => clip.id === id));
  if (selected.some((clip) => !clip)) {
    return { ok: false as const, message: "Locked final clips missing from designated discovery." };
  }
  const sourceAbsolutePath = path.join(repoRoot, DESIGNATED_CLIP_SOURCE_REL);
  const stamp = CLIP_549_OWNER_CERT_CORRECTION_STAMP;
  const musicDecision = decidePackMusic({
    spokenIdeas: selected.map((clip) => clip!.idea),
    coordinatedSet: true,
  });
  const sharedBed = path.join(repoRoot, FLAGSHIP_UPBEAT_BED_REL);
  const files = [];

  for (const candidate of selected) {
    const clip = identifiedClipFromCandidate(
      candidate!.id === "c-97-723"
        ? { ...candidate!, windowEnd: CLIP4_END_SECONDS }
        : candidate!,
      DESIGNATED_CLIP_SOURCE_REL,
    );
    const forceCue = clip.id === "c-82-641";
    const alreadyGood =
      clip.id !== "c-97-723" &&
      existsSync(path.join(repoRoot, stamp, "delivery", `${clip.id}.mp4`));
    if (alreadyGood) {
      const quality = await reviewRenderedShort({
        repoRoot,
        videoAbsolutePath: path.join(repoRoot, stamp, "delivery", `${clip.id}.mp4`),
        workDir: path.join(repoRoot, stamp, "quality-rewatch", clip.id),
      });
      if ("ok" in quality) {
        return { ok: false as const, message: `${clip.id} Quality failed: ${quality.message}` };
      }
      files.push({
        clipId: clip.id,
        idea: candidate!.idea,
        windowStart: candidate!.windowStart,
        windowEnd: candidate!.windowEnd,
        outputRelativePath: `${stamp}/delivery/${clip.id}.mp4`,
        punchInApplied: false,
        approvedEndCueRestored:
          forceCue && existsSync(path.join(repoRoot, stamp, "work", clip.id, "ending-cued.mp4")),
        approvedEndCueMixDb: forceCue ? CLIP3_CUE_MIX_DB : null,
        quality: {
          pass: quality.pass,
          findings: quality.findings.map((finding) => finding.code),
          inspectedRenderedMp4: quality.inspectedRenderedMp4,
          renderedAbsolutePath: path.join(repoRoot, stamp, "delivery", `${clip.id}.mp4`),
        },
      });
      continue;
    }
    const produced = await runContentPackClip({
      repoRoot,
      workDir: path.join(repoRoot, stamp, "work", clip.id),
      outputRelativePath: `${stamp}/delivery/${clip.id}.mp4`,
      sourceAbsolutePath,
      clip,
      ctaText: CLIP_549_LIVE_CTA,
      musicDecision,
      sharedMusicAbsolutePath:
        musicDecision.mode === "shared_set_bed" ? sharedBed : null,
      correction: forceCue
        ? { forceApprovedEndCue: true, approvedEndCueMixDb: CLIP3_CUE_MIX_DB }
        : null,
    });
    if (!produced.ok) return produced;
    const quality = await reviewRenderedShort({
      repoRoot,
      videoAbsolutePath: path.join(repoRoot, produced.outputRelativePath),
      workDir: path.join(repoRoot, stamp, "quality", clip.id),
    });
    if ("ok" in quality) {
      return { ok: false as const, message: `${clip.id} Quality failed: ${quality.message}` };
    }
    files.push({
      clipId: clip.id,
      idea: candidate!.idea,
      windowStart: candidate!.windowStart,
      windowEnd: candidate!.windowEnd,
      outputRelativePath: produced.outputRelativePath,
      punchInApplied: false,
      approvedEndCueRestored: forceCue && existsSync(path.join(repoRoot, stamp, "work", clip.id, "ending-cued.mp4")),
      approvedEndCueMixDb: forceCue ? CLIP3_CUE_MIX_DB : null,
      quality: {
        pass: quality.pass,
        findings: quality.findings.map((finding) => finding.code),
        inspectedRenderedMp4: quality.inspectedRenderedMp4,
        renderedAbsolutePath: path.join(repoRoot, produced.outputRelativePath),
      },
    });
  }

  const desktop = path.join(
    process.env.USERPROFILE ?? "",
    "OneDrive",
    "Desktop",
    "clip-repurposing-owner-review",
  );
  mkdirSync(desktop, { recursive: true });
  for (const file of files) {
    copyFileSync(
      path.join(repoRoot, file.outputRelativePath),
      path.join(desktop, path.basename(file.outputRelativePath)),
    );
  }

  const report = {
    kind: "clip_549_owner_unusual_cert_stable_open",
    automaticOpeningZoom: false,
    punchInOnlyWhenIntentionallyChosen: true,
    clip3ApprovedEndCueRestored: files.some(
      (file) => file.clipId === "c-82-641" && file.approvedEndCueRestored,
    ),
    clip3CueMixDb: CLIP3_CUE_MIX_DB,
    fifthKept: "c-50-377",
    rankingReopened: false,
    deliveredCount: files.length,
    files,
    ownerDesktopFolder: desktop,
  };
  mkdirSync(path.join(repoRoot, stamp), { recursive: true });
  writeFileSync(
    path.join(repoRoot, stamp, "OWNER-CERT-STABLE-OPEN.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return { ok: true as const, report };
}
