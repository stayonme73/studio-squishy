/**
 * CREATIVE QUALITY CALIBRATION — verification harness.
 *
 * Two questions, answered without spending a cent:
 *
 *   1. Does the strengthened Creative Director reject Customer-One V19, and for
 *      objective reasons the owner can point at?
 *   2. What does the repaired composer do with the *same already-paid* generated
 *      image, and does that composition clear the same gates?
 *
 * Nothing here calls a provider. The image layer is the one V19 already paid
 * for; composition and render are local (Playwright), so this is free to rerun.
 *
 *   npx tsx scripts/creative-quality-gate-verification.mts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { readCampaignEnvelope } from "../src/lib/campaign-store/store";
import { readMaterialsEnvelope } from "../src/lib/materials/store";
import { hybridLockupPlanFor } from "../src/lib/studio-design-intelligence/hybrid-layout-signatures";
import type { DesignLayoutFamilyId } from "../src/lib/studio-design-intelligence/types";
import { evaluateFlyerOutputReadability } from "../src/lib/studio-design-renderer/flyer-output-readability";
import { captureFlyerExports } from "../src/lib/studio-design-renderer/capture";
import { reasonFlyerDesignSpecDeterministic } from "../src/lib/studio-design-renderer/reason";
import { renderFlyerHtml } from "../src/lib/studio-design-renderer/render-html";
import type { FlyerDesignSpec } from "../src/lib/studio-design-renderer/types";
import { mapFlyerProjectTruthFromJob } from "../src/lib/studio-dispatch/map-flyer-job-truth";
import { composeHybridSpec } from "../src/lib/studio-project-alpha/compose-hybrid";
import { checkComposedArtifactCreativeQuality } from "../src/lib/studio-project-alpha/composed-artifact-quality";
import {
  checkHybridComposition,
  evaluateHybridLayoutFamilyAgreement,
} from "../src/lib/studio-project-alpha/composition-checks";

const repoRoot = process.cwd();
const CAMPAIGN_ID = "9c6c25f2-2562-4192-97a5-44536e45cd18";
const RENDERS = `data/campaign-design-artifacts/${CAMPAIGN_ID}/dd_${CAMPAIGN_ID}_v2-rtu-flyer/renders`;
const OUT = "data/qa/creative-quality-calibration";

/** Every family the reasoner may pick, so "the label moves the layout" is testable. */
const FAMILIES: readonly DesignLayoutFamilyId[] = [
  "type_led_premium",
  "editorial_split",
  "bold_asymmetric",
  "service_rail",
  "modular_thirds",
  "centered_promotional_plate",
];

function storedSpec(version: string): FlyerDesignSpec {
  return JSON.parse(
    readFileSync(path.join(repoRoot, RENDERS, version, "design-spec.json"), "utf8"),
  ) as FlyerDesignSpec;
}

function generatedPathOf(spec: FlyerDesignSpec): string | undefined {
  return spec.materials.find(
    (material) => material.materialId === "hybrid-generated-visual",
  )?.relativePath;
}

function line(label: string, value: string): void {
  console.log(`  ${label.padEnd(34)} ${value}`);
}

async function gradeStored(version: string): Promise<void> {
  const spec = storedSpec(version);
  const family = spec.creativeDirection?.layoutFamilyId ?? "none";
  console.log(`\n=== stored ${version}  (route claimed ${family}) ===`);

  const generated = generatedPathOf(spec);
  const composed = await checkComposedArtifactCreativeQuality({
    repoRoot,
    composedAbsolutePath: path.join(repoRoot, RENDERS, version, "flyer.png"),
    generatedAbsolutePath: generated ? path.join(repoRoot, generated) : null,
    spec,
  });
  const readability = evaluateFlyerOutputReadability(spec);
  const agreement = evaluateHybridLayoutFamilyAgreement(spec);
  const geometry = checkHybridComposition(spec);

  line(
    "largest dead region / canvas",
    `${composed.measured.largestInertRegionShareOfCanvas} (luma span ${composed.measured.largestInertRegionLuminanceSpan})`,
  );
  line("inert below lockup", String(composed.measured.inertShareBelowLockup));
  line("painted share of canvas", String(composed.measured.coveredShare));
  line("plate area / canvas", String(composed.measured.plateAreaShare));
  line(
    "under plate: detail / light",
    `${composed.measured.detailConcentrationUnderPlate}x / ${composed.measured.lightConcentrationUnderPlate}x`,
  );
  console.log(
    `  verdict: ${
      composed.ok && readability.length === 0 && agreement.length === 0
        ? "PASS"
        : "REJECT — technically correct, creatively insufficient"
    }`,
  );
  for (const finding of composed.findings) console.log(`   · ${finding.code}: ${finding.message}`);
  for (const finding of readability) console.log(`   · ${finding.id}: ${finding.message}`);
  for (const finding of agreement) console.log(`   · ${finding.id}: ${finding.message}`);
  if (!geometry.ok) {
    for (const finding of geometry.findings) console.log(`   · geometry ${finding.code}`);
  }
}

/**
 * Recompose Customer-One's real locked facts under the repaired composer, render
 * locally, and grade the result. Truth comes from the campaign record the hook
 * reads, the spec from the deterministic reasoner, and the image layer is the one
 * V19 already paid for. No provider is contacted; nothing is minted into the
 * customer's artifact lineage.
 */
async function recomposeAndGrade(sourceVersion: string): Promise<void> {
  const source = storedSpec(sourceVersion);
  const generated = generatedPathOf(source);
  if (!generated || !existsSync(path.join(repoRoot, generated))) {
    console.log(`\n(cannot recompose ${sourceVersion}: generated layer is not on disk)`);
    return;
  }
  const envelope = await readCampaignEnvelope(CAMPAIGN_ID);
  if (!envelope) throw new Error("Customer-One campaign missing");
  const dispatchRecord = envelope.record.dispatchExecution?.records.find(
    (record) => record.skuId === "v2-rtu-flyer",
  );
  if (!dispatchRecord) throw new Error("Customer-One flyer dispatch record missing");
  const mapped = mapFlyerProjectTruthFromJob({
    repoRoot,
    campaign: envelope.record,
    dispatchRecord,
    materials: (await readMaterialsEnvelope(CAMPAIGN_ID))?.items ?? [],
  });
  if (!mapped.ok) throw new Error(`truth mapping failed: ${mapped.code}`);

  for (const familyId of FAMILIES) {
    const truth = {
      ...mapped.truth,
      creativeDirection: mapped.truth.creativeDirection
        ? {
            ...mapped.truth.creativeDirection,
            selectedRoute: {
              ...mapped.truth.creativeDirection.selectedRoute,
              layoutFamilyId: familyId,
            },
          }
        : undefined,
    };
    const recomposed = composeHybridSpec(
      reasonFlyerDesignSpecDeterministic(truth),
      {
        ok: true,
        relativePath: generated,
        contentSha256: "reused",
        model: "reused-no-spend",
        prompt: "reused",
        bytes: 0,
      },
    );
    const outDir = path.join(repoRoot, OUT, `recomposed-${familyId}`);
    mkdirSync(outDir, { recursive: true });
    const htmlAbs = path.join(outDir, "flyer.html");
    writeFileSync(htmlAbs, renderFlyerHtml(repoRoot, recomposed), "utf8");
    const pngAbs = path.join(outDir, "flyer.png");
    await captureFlyerExports({
      htmlAbsolutePath: htmlAbs,
      pngAbsolutePath: pngAbs,
      pdfAbsolutePath: path.join(outDir, "flyer.pdf"),
      widthPx: recomposed.canvas.widthPx,
      heightPx: recomposed.canvas.heightPx,
    });
    writeFileSync(
      path.join(outDir, "design-spec.json"),
      `${JSON.stringify(recomposed, null, 2)}\n`,
      "utf8",
    );

    const relative = path.relative(repoRoot, pngAbs).split(path.sep).join("/");
    const generatedAbs = path.join(repoRoot, generated);
    console.log(
      `\n=== ${sourceVersion} recomposed as ${familyId} (same paid image, local render) ===`,
    );
    const plan = hybridLockupPlanFor(familyId, recomposed.canvas.widthPx, recomposed.canvas.heightPx);
    line("plan plate x / width", `${plan.plateX} / ${plan.plateWidth}`);
    line("reserved image zone", plan.reservedImageZone);
    const composed = await checkComposedArtifactCreativeQuality({
      repoRoot,
      composedAbsolutePath: pngAbs,
      generatedAbsolutePath: generatedAbs,
      spec: recomposed,
    });
    const readability = evaluateFlyerOutputReadability(recomposed);
    const agreement = evaluateHybridLayoutFamilyAgreement(recomposed);
    const geometry = checkHybridComposition(recomposed);
    line(
      "largest dead region / canvas",
      `${composed.measured.largestInertRegionShareOfCanvas} (luma span ${composed.measured.largestInertRegionLuminanceSpan})`,
    );
    line("inert below lockup", String(composed.measured.inertShareBelowLockup));
    line(
      "under plate: detail / light",
      `${composed.measured.detailConcentrationUnderPlate}x / ${composed.measured.lightConcentrationUnderPlate}x`,
    );
    console.log(`  artifact: ${relative}`);
    console.log(
      `  verdict: ${
        composed.ok && readability.length === 0 && agreement.length === 0 && geometry.ok
          ? "PASS"
          : "REJECT — technically correct, creatively insufficient"
      }`,
    );
    for (const finding of composed.findings) console.log(`   · ${finding.code}: ${finding.message}`);
    for (const finding of readability) console.log(`   · ${finding.id}: ${finding.message}`);
    for (const finding of agreement) console.log(`   · ${finding.id}: ${finding.message}`);
    for (const finding of geometry.findings) console.log(`   · geometry ${finding.code}: ${finding.message}`);
  }
}

async function main(): Promise<void> {
  for (const version of ["v18", "v19"]) await gradeStored(version);
  await recomposeAndGrade("v19");
}

void main();
