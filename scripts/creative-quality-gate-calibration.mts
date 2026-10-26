/**
 * CREATIVE QUALITY CALIBRATION — measurement harness.
 *
 * Prints the raw measurements the Creative Director gates read, for every
 * composed hybrid artifact in the repo. Thresholds are chosen from this table,
 * not guessed: run it, look at the spread, then set the constants.
 *
 * Read-only. No provider calls. No production.
 *
 *   npx tsx scripts/creative-quality-gate-calibration.mts
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";

import {
  measureComposedCanvasVitality,
  measureSubjectObstruction,
} from "../src/lib/studio-project-alpha/composed-artifact-quality";
import type { FlyerDesignSpec } from "../src/lib/studio-design-renderer/types";

const repoRoot = process.cwd();
const artifactsRoot = "data/campaign-design-artifacts";

type Candidate = {
  label: string;
  composedAbsolutePath: string;
  generatedAbsolutePath: string;
  spec: FlyerDesignSpec;
  mtimeMs: number;
  /**
   * The generated layer this render actually used has since been overwritten.
   *
   * Generated visuals are stored per deliverable as `hybrid-visual-a1/a2/a3.png`
   * and reused run to run, so an older render can name a file that now holds a
   * later run's image. Coverage is measured by differencing composed against
   * generated, so those rows are differencing against the wrong picture and are
   * not calibration evidence. Detected by comparing file times, and printed on
   * the row so a stale number cannot be quoted as a measurement.
   */
  generatedIsStale: boolean;
};

function findHybridArtifacts(): Candidate[] {
  const found: Candidate[] = [];
  const rootAbs = path.join(repoRoot, artifactsRoot);
  if (!existsSync(rootAbs)) return found;
  for (const campaign of readdirSync(rootAbs)) {
    const campaignAbs = path.join(rootAbs, campaign);
    if (!statSync(campaignAbs).isDirectory()) continue;
    for (const design of readdirSync(campaignAbs)) {
      const rendersAbs = path.join(campaignAbs, design, "renders");
      if (!existsSync(rendersAbs)) continue;
      for (const version of readdirSync(rendersAbs)) {
        const pngAbs = path.join(rendersAbs, version, "flyer.png");
        const specAbs = path.join(rendersAbs, version, "design-spec.json");
        if (!existsSync(pngAbs) || !existsSync(specAbs)) continue;
        const spec = JSON.parse(readFileSync(specAbs, "utf8")) as FlyerDesignSpec;
        if (!spec.layers.some((layer) => layer.id === "generated-hero")) continue;
        const material = spec.materials.find(
          (candidate) => candidate.materialId === "hybrid-generated-visual",
        );
        if (!material) continue;
        const generatedAbsolutePath = path.join(repoRoot, material.relativePath);
        if (!existsSync(generatedAbsolutePath)) continue;
        found.push({
          label: `${campaign.slice(0, 8)}/${version}`,
          composedAbsolutePath: pngAbs,
          generatedAbsolutePath,
          spec,
          mtimeMs: statSync(pngAbs).mtimeMs,
          generatedIsStale:
            statSync(generatedAbsolutePath).mtimeMs > statSync(specAbs).mtimeMs,
        });
      }
    }
  }
  return found.sort((left, right) => left.mtimeMs - right.mtimeMs);
}

async function main(): Promise<void> {
  const candidates = findHybridArtifacts();
  console.log(`composed hybrid artifacts: ${candidates.length}\n`);
  for (const candidate of candidates) {
    const vitality = await measureComposedCanvasVitality({
      repoRoot,
      composedAbsolutePath: candidate.composedAbsolutePath,
      generatedAbsolutePath: candidate.generatedAbsolutePath,
      spec: candidate.spec,
    });
    const obstruction = await measureSubjectObstruction({
      repoRoot,
      composedAbsolutePath: candidate.composedAbsolutePath,
      generatedAbsolutePath: candidate.generatedAbsolutePath,
      spec: candidate.spec,
    });
    const direction = candidate.spec.creativeDirection;
    console.log(
      [
        candidate.label,
        `family=${direction?.layoutFamilyId ?? "none"}`,
        `geometry=${direction?.geometryId ?? "none"}`,
        `reasoner=${candidate.spec.reasoningMode}`,
        candidate.generatedIsStale
          ? "** GENERATED LAYER OVERWRITTEN SINCE THIS RENDER — NOT CALIBRATION EVIDENCE **"
          : "",
      ]
        .filter(Boolean)
        .join("  "),
    );
    console.log(
      `  dead region ${vitality.largestInertRegionShareOfCanvas.toFixed(3)} of canvas (span ${vitality.largestInertRegionLuminanceSpan.toFixed(1)}, visible ${vitality.largestInertRegionVisibleShare.toFixed(4)})  |  inert cells ${vitality.inertCellShare.toFixed(3)} of uncovered  |  tallest inert band ${vitality.tallestInertBandShareOfHeight.toFixed(3)}`,
    );
    console.log(
      `  painted share ${vitality.coveredShare.toFixed(3)}  |  lockup bottom ${vitality.lockupBottomPx}px  |  below-lockup area ${vitality.belowLockupShareOfCanvas.toFixed(3)} inert ${vitality.inertShareBelowLockup.toFixed(3)} p90 ${vitality.belowLockupP90Luminance.toFixed(1)} visible ${vitality.belowLockupVisibleShare.toFixed(4)}  |  canvas mean luma ${vitality.meanLuminance.toFixed(1)}`,
    );
    if (obstruction) {
      console.log(
        `  plate area ${obstruction.plateAreaShare.toFixed(3)}  |  detail ${obstruction.detailShareUnderPlate.toFixed(3)} (${obstruction.detailConcentrationRatio.toFixed(2)}x)  |  light ${obstruction.lightShareUnderPlate.toFixed(3)} (${obstruction.lightConcentrationRatio.toFixed(2)}x)  |  top-decile covered ${obstruction.topDecileDetailCoveredShare.toFixed(3)}`,
      );
    }
    console.log("");
  }
}

void main();
