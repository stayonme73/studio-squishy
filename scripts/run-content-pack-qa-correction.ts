import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { FLAGSHIP_UPBEAT_BED_REL } from "../src/lib/studio-flagship-short-form-edit/music";
import { prepareFlagshipCustomerStyleSource } from "../src/lib/studio-flagship-short-form-edit/source-prep";
import { applyDotenvLocal } from "../src/lib/studio-short-form-video-editing/load-env-local";
import { runContentPackClip } from "../src/lib/studio-short-form-content-pack/clip";
import { decidePackMusic } from "../src/lib/studio-short-form-content-pack/music-decision";
import { contentPackCertIntake } from "../src/lib/studio-short-form-content-pack/scenario";

async function main() {
  const repoRoot = process.cwd();
  applyDotenvLocal(repoRoot);
  const source = prepareFlagshipCustomerStyleSource({ repoRoot });
  if (!source.ok) {
    console.error(source.message);
    process.exit(2);
  }
  const intake = contentPackCertIntake();
  const musicDecision = decidePackMusic({
    spokenIdeas: intake.clips.map((clip) => clip.label),
    coordinatedSet: true,
  });
  const sharedBed = path.join(repoRoot, FLAGSHIP_UPBEAT_BED_REL);
  const stampDir =
    "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/content-pack";
  mkdirSync(path.join(repoRoot, stampDir, "delivery"), { recursive: true });
  const clips = [];
  for (const clip of intake.clips) {
    const result = await runContentPackClip({
      repoRoot,
      workDir: path.join(repoRoot, stampDir, "work", `${clip.id}-qa-correction`),
      outputRelativePath: `${stampDir}/delivery/${clip.id}-qa-corrected.mp4`,
      sourceAbsolutePath: source.absolutePath,
      clip,
      ctaText: intake.ctaText,
      musicDecision,
      sharedMusicAbsolutePath:
        musicDecision.mode === "shared_set_bed" ? sharedBed : null,
    });
    if (!result.ok) {
      console.error(result.message);
      process.exit(2);
    }
    clips.push({
      id: result.clipId,
      openingText: result.openingText,
      endingText: result.endingText,
      spokenIdea: result.spokenIdea,
      brollUsed: result.brollUsed,
      brollToken: result.brollToken,
      brollThoughtText: result.brollThoughtText,
      brollStartSeconds: result.brollStartSeconds,
      brollEndSeconds: result.brollEndSeconds,
      output: result.outputRelativePath,
    });
  }
  const report = {
    publicCatalogSwitched: false,
    doNotStartClip: true,
    clips,
  };
  writeFileSync(
    path.join(repoRoot, stampDir, "QA-CORRECTION.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
