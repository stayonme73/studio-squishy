import { copyFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { studio349ShortFormContentPackOwnerUnusualCertV1 as cert } from "@/config/studio-349-short-form-content-pack-owner-unusual-cert-v1";
import { FLAGSHIP_UPBEAT_BED_REL } from "@/lib/studio-flagship-short-form-edit/music";
import { prepareFlagshipCustomerStyleSource } from "@/lib/studio-flagship-short-form-edit/source-prep";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";

import { runContentPackClip } from "./clip";
import { machineDecideCorrection, type PackCorrectionKind } from "./machine-corrections";
import { decidePackMusic } from "./music-decision";
import {
  applyContentPackSetRevision,
  runContentPackFactory,
  type ContentPackFactoryResult,
} from "./pipeline";
import { reviewRenderedShort, type QualityFinding } from "./quality-review";
import {
  CONTENT_PACK_CERT_SCENARIO,
  contentPackCertIntake,
} from "./scenario";

export type UnusualCertClipTrace = {
  clipId: string;
  label: string;
  firstBrollUsed: boolean;
  firstBrollReason: string;
  firstMusicUsed: boolean;
  qualityFindings: string[];
  loops: number;
  corrections: PackCorrectionKind[];
  finalPass: boolean;
  routedToOwner: boolean;
  routedToScout: boolean;
  finalOutput: string;
  brollUsed: boolean;
  brollReason: string;
  musicUsed: boolean;
};

export type UnusualCertProof = {
  publicCatalogSwitched: false;
  doNotStartClip: true;
  doNotClassifySellNow: true;
  classification: "READY FOR OWNER UNUSUAL CERTIFICATION" | "NOT READY — SPECIFIC BLOCKER";
  blocker: string | null;
  scenario: typeof CONTENT_PACK_CERT_SCENARIO;
  musicDecision: ReturnType<typeof decidePackMusic>;
  clips: UnusualCertClipTrace[];
  revision: {
    kind: "change_set_cta";
    nextCta: string;
    exhaustedSecond: boolean;
  };
  ownerHandoffRelativePath: string;
  routineWithoutScout: boolean;
  routineWithoutOwner: boolean;
};

async function qualityCorrectClip(input: {
  repoRoot: string;
  stampDir: string;
  sourceAbsolutePath: string;
  clip: ReturnType<typeof contentPackCertIntake>["clips"][number];
  ctaText: string;
  musicDecision: ReturnType<typeof decidePackMusic>;
  first: ContentPackFactoryResult["clips"][number];
}): Promise<UnusualCertClipTrace | { ok: false; message: string }> {
  const workRoot = path.join(input.repoRoot, input.stampDir, "quality", input.clip.id);
  mkdirSync(workRoot, { recursive: true });
  let outputRel = input.first.outputRelativePath;
  let current = await reviewRenderedShort({
    repoRoot: input.repoRoot,
    videoAbsolutePath: path.join(input.repoRoot, outputRel),
    workDir: path.join(workRoot, "quality-0"),
  });
  if ("ok" in current) return current;
  const findings = current.findings.map((finding: QualityFinding) => finding.code);
  const corrections: PackCorrectionKind[] = [];
  let loops = 0;
  let routedToOwner = false;
  let routedToScout = false;
  let previousKinds: PackCorrectionKind[] = [];
  let produced = input.first;
  while (!current.pass && loops < cert.maxInternalCorrectionLoops) {
    const decision = machineDecideCorrection({
      review: current,
      loopIndex: loops,
      previousKinds,
    });
    if (decision.route === "escalate_owner") {
      routedToOwner = true;
      break;
    }
    if (decision.route === "escalate_scout") {
      routedToScout = true;
      break;
    }
    if (decision.route !== "production") break;
    const nextRel = `${input.stampDir}/work/${input.clip.id}-loop-${loops + 1}.mp4`;
    let next = await runContentPackClip({
      repoRoot: input.repoRoot,
      workDir: path.join(workRoot, `production-${loops + 1}`),
      outputRelativePath: nextRel,
      sourceAbsolutePath: input.sourceAbsolutePath,
      clip: input.clip,
      ctaText: input.ctaText,
      musicDecision: input.musicDecision,
      sharedMusicAbsolutePath:
        input.musicDecision.mode === "shared_set_bed"
          ? path.join(input.repoRoot, FLAGSHIP_UPBEAT_BED_REL)
          : null,
      correction: decision.instruction,
    });
    if (!next.ok && /fetch failed/i.test(next.message)) {
      next = await runContentPackClip({
        repoRoot: input.repoRoot,
        workDir: path.join(workRoot, `production-${loops + 1}-retry`),
        outputRelativePath: nextRel,
        sourceAbsolutePath: input.sourceAbsolutePath,
        clip: input.clip,
        ctaText: input.ctaText,
        musicDecision: input.musicDecision,
        sharedMusicAbsolutePath:
          input.musicDecision.mode === "shared_set_bed"
            ? path.join(input.repoRoot, FLAGSHIP_UPBEAT_BED_REL)
            : null,
        correction: decision.instruction,
      });
    }
    if (!next.ok) return next;
    produced = next;
    outputRel = next.outputRelativePath;
    previousKinds = decision.instruction.kinds;
    corrections.push(...decision.instruction.kinds);
    loops += 1;
    const again = await reviewRenderedShort({
      repoRoot: input.repoRoot,
      videoAbsolutePath: path.join(input.repoRoot, outputRel),
      workDir: path.join(workRoot, `quality-${loops}`),
    });
    if ("ok" in again) return again;
    current = again;
  }
  return {
    clipId: input.clip.id,
    label: input.clip.label,
    firstBrollUsed: input.first.brollUsed,
    firstBrollReason: input.first.brollReason,
    firstMusicUsed: input.first.musicUsed,
    qualityFindings: findings,
    loops,
    corrections,
    finalPass: current.pass,
    routedToOwner,
    routedToScout,
    finalOutput: outputRel,
    brollUsed: produced.brollUsed,
    brollReason: produced.brollReason,
    musicUsed: produced.musicUsed,
  };
}

export async function run349OwnerUnusualCert(input: {
  repoRoot: string;
}): Promise<UnusualCertProof | { ok: false; message: string }> {
  applyDotenvLocal(input.repoRoot);
  const source = prepareFlagshipCustomerStyleSource({ repoRoot: input.repoRoot });
  if (!source.ok) return source;
  const intake = contentPackCertIntake();
  const stampDir = cert.stampDir;
  const first = await runContentPackFactory({
    repoRoot: input.repoRoot,
    intake,
    sourceAbsolutePath: source.absolutePath,
    stampDir,
  });
  if (!first.ok) return first;

  const traces: UnusualCertClipTrace[] = [];
  for (const clip of intake.clips) {
    const produced = first.clips.find((row) => row.clipId === clip.id);
    if (!produced) return { ok: false, message: `Missing first cut for ${clip.id}` };
    const trace = await qualityCorrectClip({
      repoRoot: input.repoRoot,
      stampDir,
      sourceAbsolutePath: source.absolutePath,
      clip,
      ctaText: intake.ctaText,
      musicDecision: first.musicDecision,
      first: produced,
    });
    if ("ok" in trace) return trace;
    traces.push(trace);
    produced.outputRelativePath = trace.finalOutput;
    produced.brollUsed = trace.brollUsed;
    produced.brollReason = trace.brollReason;
    produced.musicUsed = trace.musicUsed;
  }

  const revised = await applyContentPackSetRevision({
    repoRoot: input.repoRoot,
    pack: first,
    request: {
      kind: "change_set_cta",
      note: "Customer asked for a shorter set CTA.",
      nextCtaText: CONTENT_PACK_CERT_SCENARIO.ctaRevision,
    },
    stampDir,
  });
  if (!revised.ok) return revised;

  const ownerDir = path.join(input.repoRoot, cert.ownerHandoffDir);
  mkdirSync(ownerDir, { recursive: true });
  for (const clip of revised.pack.clips) {
    copyFileSync(
      path.join(input.repoRoot, clip.outputRelativePath),
      path.join(ownerDir, `${clip.clipId}.mp4`),
    );
  }
  for (const cover of first.covers) {
    copyFileSync(
      path.join(input.repoRoot, cover.relativePath),
      path.join(ownerDir, path.basename(cover.relativePath)),
    );
  }
  writeFileSync(
    path.join(ownerDir, "post-captions.txt"),
    `${revised.pack.postCaptions.map((row) => `${row.clipId}\n${row.text}`).join("\n\n")}\n`,
  );
  copyFileSync(
    path.join(input.repoRoot, revised.pack.useGuideRelativePath),
    path.join(ownerDir, "use-guide.md"),
  );

  const blocker = traces.find((row) => !row.finalPass || row.routedToOwner || row.routedToScout);
  const proof: UnusualCertProof = {
    publicCatalogSwitched: false,
    doNotStartClip: true,
    doNotClassifySellNow: true,
    classification: blocker
      ? "NOT READY — SPECIFIC BLOCKER"
      : "READY FOR OWNER UNUSUAL CERTIFICATION",
    blocker: blocker
      ? `${blocker.clipId} ${blocker.routedToOwner ? "owner" : blocker.routedToScout ? "scout" : "quality"} ${blocker.qualityFindings.join(",")}`
      : null,
    scenario: CONTENT_PACK_CERT_SCENARIO,
    musicDecision: first.musicDecision,
    clips: traces,
    revision: {
      kind: "change_set_cta",
      nextCta: CONTENT_PACK_CERT_SCENARIO.ctaRevision,
      exhaustedSecond: true,
    },
    ownerHandoffRelativePath: cert.ownerHandoffDir,
    routineWithoutScout: traces.every((row) => !row.routedToScout),
    routineWithoutOwner: traces.every((row) => !row.routedToOwner),
  };
  writeFileSync(
    path.join(input.repoRoot, stampDir, "UNUSUAL-CERT-PROOF.json"),
    `${JSON.stringify(proof, null, 2)}\n`,
  );
  return proof;
}
