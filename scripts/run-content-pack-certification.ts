import { writeFileSync } from "fs";
import path from "path";

import { prepareFlagshipCustomerStyleSource } from "../src/lib/studio-flagship-short-form-edit/source-prep";
import {
  applyContentPackSetRevision,
  runContentPackFactory,
} from "../src/lib/studio-short-form-content-pack/pipeline";
import { evaluatePackRevision } from "../src/lib/studio-short-form-content-pack/revision";
import {
  CONTENT_PACK_CERT_SCENARIO,
  contentPackCertIntake,
} from "../src/lib/studio-short-form-content-pack/scenario";

async function main() {
  const repoRoot = process.cwd();
  const source = prepareFlagshipCustomerStyleSource({ repoRoot });
  if (!source.ok) {
    console.error(source.message);
    process.exit(2);
  }
  const first = await runContentPackFactory({
    repoRoot,
    intake: contentPackCertIntake(),
    sourceAbsolutePath: source.absolutePath,
  });
  if (!first.ok) {
    console.error(first.message);
    process.exit(2);
  }
  const revised = await applyContentPackSetRevision({
    repoRoot,
    pack: first,
    request: {
      kind: "change_set_cta",
      note: "Change the ending on the whole set.",
      nextCtaText: CONTENT_PACK_CERT_SCENARIO.ctaRevision,
    },
  });
  if (!revised.ok) {
    console.error(revised.message);
    process.exit(2);
  }
  const exhausted = evaluatePackRevision(revised.pack.revisionLedger, {
    kind: "different_opening",
    note: "Now also change the intro opening.",
    clipId: "clip-01-intro",
  });
  const report = {
    scenario: CONTENT_PACK_CERT_SCENARIO,
    firstCut: {
      clips: first.clips.map((clip) => ({
        id: clip.clipId,
        label: clip.label,
        spokenIdea: clip.spokenIdea,
        output: clip.outputRelativePath,
        musicUsed: clip.musicUsed,
        musicShared: clip.musicShared,
        brollUsed: clip.brollUsed,
        brollReason: clip.brollReason,
        durationSeconds: clip.inspect.durationSeconds,
      })),
      postCaptions: first.postCaptions,
      covers: first.covers,
      useGuide: first.useGuideRelativePath,
      musicDecision: first.musicDecision,
      spend: first.spend,
    },
    setRevision: {
      kind: "change_set_cta",
      nextCta: CONTENT_PACK_CERT_SCENARIO.ctaRevision,
      clips: revised.pack.clips.map((clip) => clip.outputRelativePath),
      ledger: revised.pack.revisionLedger,
    },
    exhaustedSecondRevision: exhausted,
    publicCatalogSwitched: false,
    doNotStartClip: true,
  };
  writeFileSync(
    path.join(
      repoRoot,
      "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack/CERT-RUN.json",
    ),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
  if (exhausted.ok) process.exit(3);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
