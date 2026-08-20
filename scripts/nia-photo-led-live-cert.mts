/**
 * Nia photo-led live certification — produce square/vertical/print + revision.
 */
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import path from "path";

import { runCampaignCreativePipeline } from "../src/lib/studio-campaign-creative/pipeline.ts";
import { applyHeroPhotoRevision } from "../src/lib/studio-campaign-creative/revision.ts";
import {
  buildNiaFallResetCreativeBrief,
  NIA_DEFAULT_VISUAL_SYSTEM_ID,
  NIA_PHOTO_ASSET_IDS,
} from "../src/lib/studio-campaign-creative/nia-brief.ts";

const repoRoot = process.cwd();
const packRel =
  "docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/nia-photo-pack";
const outRel =
  "docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/nia-photo-live-cert";

const materials = [
  {
    materialId: NIA_PHOTO_ASSET_IDS.logo,
    role: "logo" as const,
    relativePath: `${packRel}/nia-logo.svg`,
  },
  {
    materialId: NIA_PHOTO_ASSET_IDS.windowPortrait,
    role: "hero" as const,
    relativePath: `${packRel}/nia-photo-good-1.jpg`,
  },
  {
    materialId: NIA_PHOTO_ASSET_IDS.standingPortrait,
    role: "support" as const,
    relativePath: `${packRel}/nia-photo-good-2.jpg`,
  },
  {
    materialId: NIA_PHOTO_ASSET_IDS.activity,
    role: "support" as const,
    relativePath: `${packRel}/nia-photo-good-3.jpg`,
  },
  {
    materialId: NIA_PHOTO_ASSET_IDS.environment,
    role: "support" as const,
    relativePath: `${packRel}/nia-photo-good-4.jpg`,
  },
  {
    materialId: NIA_PHOTO_ASSET_IDS.mediocre1,
    role: "support" as const,
    relativePath: `${packRel}/nia-photo-mediocre-1.jpg`,
  },
  {
    materialId: NIA_PHOTO_ASSET_IDS.mediocre2,
    role: "support" as const,
    relativePath: `${packRel}/nia-photo-mediocre-2.jpg`,
  },
];

function publishRenderDir(
  label: string,
  artifactRootRel: string,
  version: number,
): string {
  const srcDir = path.join(
    repoRoot,
    artifactRootRel,
    "renders",
    `v${version}`,
  );
  const destDir = path.join(repoRoot, outRel, label);
  mkdirSync(destDir, { recursive: true });
  for (const file of readdirSync(srcDir)) {
    if (
      file.endsWith(".png") ||
      file.endsWith(".pdf") ||
      file.endsWith(".json")
    ) {
      copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    }
  }
  return destDir;
}

async function main() {
  const briefV1 = buildNiaFallResetCreativeBrief({
    campaignId: "nia-r4b-photo-led-live-cert",
    // Start on standing studio so revision TO window is meaningful
    primaryPhotoId: NIA_PHOTO_ASSET_IDS.standingPortrait,
  });

  const artifactRootRel = `${outRel}/_machine-artifacts`;

  console.log("RUN_V1_primary=nia-photo-good-2");
  const v1 = await runCampaignCreativePipeline({
    repoRoot,
    brief: briefV1,
    systemId: NIA_DEFAULT_VISUAL_SYSTEM_ID,
    materials,
    artifactRootRel,
  });
  publishRenderDir(
    "v1-hero-good-2-standing",
    artifactRootRel,
    v1.renderVersion,
  );

  console.log("RUN_V2_revision_to_window=nia-photo-good-1");
  const v2 = await applyHeroPhotoRevision({
    repoRoot,
    priorIdentity: v1.identity,
    brief: briefV1,
    newPrimaryPhotoId: NIA_PHOTO_ASSET_IDS.windowPortrait,
    materials,
    artifactRootRel,
    systemId: NIA_DEFAULT_VISUAL_SYSTEM_ID,
  });
  publishRenderDir(
    "v2-revision-window-good-1",
    artifactRootRel,
    v2.renderVersion,
  );

  const summary = {
    packageId: "STUDIO-OPERATING-ROOM-4B-NIA-PHOTO-LED-LIVE-CERTIFICATION-1",
    kind: "controlled_fictional_nia_photo_pack_live_cert",
    packRel,
    outRel,
    v1: {
      hero: NIA_PHOTO_ASSET_IDS.standingPortrait,
      familyId: v1.identity.familyId,
      renderVersion: v1.renderVersion,
      dir: "v1-hero-good-2-standing",
      qaPass: v1.qa.pass,
    },
    v2: {
      hero: NIA_PHOTO_ASSET_IDS.windowPortrait,
      familyId: v2.identity.familyId,
      renderVersion: v2.renderVersion,
      dir: "v2-revision-window-good-1",
      qaPass: v2.qa.pass,
      systemPreserved: v2.identity.systemId === v1.identity.systemId,
    },
    creativeDirectorQuestion:
      "Would The Studio confidently charge Nia for this exact campaign?",
  };

  writeFileSync(
    path.join(repoRoot, outRel, "LIVE-CERT-SUMMARY.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
