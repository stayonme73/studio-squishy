/**
 * STUDIO-OPERATING-DESIGN-SM-001-PROOF-1
 * Proof only — primaryTool stays Canva. No dispatch. Sealed six lanes untouched.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production";

import { runDesignRendererProofPipeline } from "./pipeline";
import { buildHarborOakFlyerProjectTruth } from "./fixtures";
import { buildHarborOakBusinessCardProjectTruth } from "./card-fixtures";
import { runBusinessCardProofPipeline } from "./card-pipeline";
import {
  buildSaltCedarMenuProjectTruthMax,
  MENU_PROOF_ARTIFACT_ROOT,
} from "./menu-fixtures";
import { runMenuProofPipeline } from "./menu-pipeline";
import {
  buildHarborOakServiceSheetProjectTruthMax,
  SERVICE_SHEET_PROOF_ARTIFACT_ROOT,
} from "./service-sheet-fixtures";
import { runServiceSheetProofPipeline } from "./service-sheet-pipeline";
import {
  buildHarborOakPromoCampaignSetTruth,
  PROMO_PROOF_ARTIFACT_ROOT,
} from "./promo-fixtures";
import { runPromoProofPipeline } from "./promo-pipeline";
import {
  buildHarborOakSocialPostsSetTruth,
  SOCIAL_POSTS_PROOF_ARTIFACT_ROOT,
} from "./social-posts-fixtures";
import { runSocialPostsProofPipeline } from "./social-posts-pipeline";

import { SM_001_PROOF_CONTRACT } from "./sm-001-contracts";
import {
  buildHarborOakSm001ProjectTruth,
  SM_001_PROOF_ARTIFACT_ROOT,
} from "./sm-001-fixtures";
import {
  collectSm001NSelectSignals,
  selectSm001PlannedPostCount,
} from "./sm-001-n-select";
import { runSm001ProofPipeline } from "./sm-001-pipeline";
import { reasonSm001SetDeterministic } from "./sm-001-reason";
import { SM_001_SQUARE_PLATE } from "./sm-001-types";

const repoRoot = process.cwd();

function readJson(rel: string): unknown {
  return JSON.parse(readFileSync(path.join(repoRoot, rel), "utf8"));
}

describe("STUDIO-OPERATING-DESIGN-SM-001-PROOF-1", () => {
  it("contract locks {4,5,6}, square-only, Owner-authorized dispatch remap", () => {
    expect(SM_001_PROOF_CONTRACT.plannedPostCounts).toEqual([4, 5, 6]);
    expect(SM_001_PROOF_CONTRACT.squareOnlyExecutable).toBe(true);
    // SM-001-DISPATCH-HOOK-1 — Owner-authorized for sm-001 only.
    expect(SM_001_PROOF_CONTRACT.primaryToolRemapAuthorized).toBe(true);
    expect(SM_001_PROOF_CONTRACT.dispatchHookAuthorized).toBe(true);
    expect(SM_001_PROOF_CONTRACT.ownerRoutineResponsibility).toBe("NONE");
    expect(SM_001_SQUARE_PLATE.plateId).toBe("cert-square-1024");
  });

  it("selects plannedPostCount before execution from material richness (4/5/6)", () => {
    const full = buildHarborOakSm001ProjectTruth({
      repoRoot,
      richness: "full",
    });
    expect(full.plannedPostCount).toBe(6);
    expect(full.plannedPostCountSelection.selectedBeforeExecution).toBe(true);
    expect(full.assets).toHaveLength(6);
    expect(full.assets.map((a) => a.assetId)).toEqual([
      "social-post-1",
      "social-post-2",
      "social-post-3",
      "social-post-4",
      "social-post-5",
      "social-post-6",
    ]);

    const extended = buildHarborOakSm001ProjectTruth({
      repoRoot,
      richness: "extended",
    });
    expect(extended.plannedPostCount).toBe(5);
    expect(extended.assets).toHaveLength(5);
    expect(extended.assets.some((a) => a.assetId === "social-post-6")).toBe(
      false,
    );

    const core = buildHarborOakSm001ProjectTruth({
      repoRoot,
      richness: "core",
    });
    expect(core.plannedPostCount).toBe(4);
    expect(core.assets).toHaveLength(4);
    expect(core.assets.map((a) => a.assetId)).toEqual([
      "social-post-1",
      "social-post-2",
      "social-post-3",
      "social-post-4",
    ]);

    // Selection is not from QA/render — signals alone determine N.
    const signals = collectSm001NSelectSignals(full);
    expect(selectSm001PlannedPostCount(signals).plannedPostCount).toBe(6);
  });

  it("reasoner produces N distinct square layouts including posts 5–6", () => {
    const truth = buildHarborOakSm001ProjectTruth({
      repoRoot,
      richness: "full",
    });
    const spec = reasonSm001SetDeterministic(truth);
    expect(spec.plannedPostCount).toBe(6);
    expect(spec.assets).toHaveLength(6);
    const fingerprints = spec.assets.map((a) =>
      a.layers
        .map((l) =>
          l.type === "text"
            ? `${l.role}:${l.x},${l.y},${l.fontSizePx}`
            : `${l.role}:${l.x},${l.y},${l.width}x${l.height}`,
        )
        .join("|"),
    );
    expect(new Set(fingerprints).size).toBe(6);
    expect(spec.assets[4]!.layoutTemplate).toBe("proof_point");
    expect(spec.assets[5]!.layoutTemplate).toBe("soft_close");
    for (const a of spec.assets) {
      expect(a.plateId).toBe("cert-square-1024");
      expect(a.canvas).toEqual({ widthPx: 1024, heightPx: 1024 });
    }
  });

  it("full N=6 proof writes six PNGs, captions, order, and calendar manifest", async () => {
    const truth = buildHarborOakSm001ProjectTruth({
      repoRoot,
      richness: "full",
      campaignId: "camp-design-sm-001-proof-n6",
    });
    expect(truth.plannedPostCount).toBe(6);

    const result = await runSm001ProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: SM_001_PROOF_ARTIFACT_ROOT,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.verdict).toBe("SM_001_RENDERER_PROOF_PASS");
    expect(result.identity.plannedPostCount).toBe(6);
    expect(result.identity.assets).toHaveLength(6);
    expect(result.identity.captions).toHaveLength(6);
    expect(result.identity.postingOrder).toHaveLength(6);
    expect(result.identity.calendar.entries).toHaveLength(6);
    expect(result.identity.calendar.advisory).toBe(true);
    expect(result.identity.calendar.publishingExcluded).toBe(true);
    expect(result.executablePlate.plateId).toBe("cert-square-1024");

    for (const asset of result.identity.assets) {
      expect(existsSync(path.join(repoRoot, asset.pngRelativePath))).toBe(true);
      expect(asset.widthPx).toBe(1024);
      expect(asset.heightPx).toBe(1024);
    }
    expect(
      existsSync(path.join(repoRoot, result.identity.calendarRelativePath)),
    ).toBe(true);

    const calendarFile = readJson(result.identity.calendarRelativePath) as {
      manifest: {
        entries: {
          orderIndex: number;
          assetId: string;
          captionId: string;
          suggestedDate: string;
        }[];
        dateGovernance: { policy: string };
      };
    };
    const calendar = calendarFile.manifest;
    expect(calendar.entries).toHaveLength(6);
    expect(calendar.dateGovernance.policy).toBe("constraint_window");
    for (let i = 0; i < 6; i++) {
      const e = calendar.entries[i]!;
      expect(e.orderIndex).toBe(i + 1);
      expect(e.assetId).toBe(`social-post-${i + 1}`);
      expect(e.captionId).toBe(`caption-${i + 1}`);
      expect(e.suggestedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Inside Harbor window March 10 – April 15, 2026
      expect(e.suggestedDate >= "2026-03-10").toBe(true);
      expect(e.suggestedDate <= "2026-04-15").toBe(true);
    }
  }, 300_000);

  it("N=5 and N=4 complete structurally with exact member counts", async () => {
    const n5 = buildHarborOakSm001ProjectTruth({
      repoRoot,
      richness: "extended",
      campaignId: "camp-design-sm-001-proof-n5",
    });
    const r5 = await runSm001ProofPipeline({
      repoRoot,
      truth: n5,
      artifactRootRel: `${SM_001_PROOF_ARTIFACT_ROOT}-n5`,
    });
    expect(r5.ok).toBe(true);
    if (r5.ok) {
      expect(r5.identity.plannedPostCount).toBe(5);
      expect(r5.identity.assets).toHaveLength(5);
      expect(r5.identity.calendar.entries).toHaveLength(5);
      expect(
        r5.identity.assets.some((a) => a.assetId === "social-post-6"),
      ).toBe(false);
    }

    const n4 = buildHarborOakSm001ProjectTruth({
      repoRoot,
      richness: "core",
      campaignId: "camp-design-sm-001-proof-n4",
    });
    const r4 = await runSm001ProofPipeline({
      repoRoot,
      truth: n4,
      artifactRootRel: `${SM_001_PROOF_ARTIFACT_ROOT}-n4`,
    });
    expect(r4.ok).toBe(true);
    if (r4.ok) {
      expect(r4.identity.plannedPostCount).toBe(4);
      expect(r4.identity.assets).toHaveLength(4);
      expect(r4.identity.calendar.entries).toHaveLength(4);
    }
  }, 300_000);

  it("whole-set versioning includes plannedPostCount + calendar; prior vN retained", async () => {
    const artifactRootRel = `${SM_001_PROOF_ARTIFACT_ROOT}-versioning`;
    const truth = buildHarborOakSm001ProjectTruth({
      repoRoot,
      richness: "full",
      campaignId: "camp-design-sm-001-proof-versioning",
    });
    const first = await runSm001ProofPipeline({
      repoRoot,
      truth,
      artifactRootRel,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const v1 = first.identity.campaignSetRenderVersion;

    const second = await runSm001ProofPipeline({
      repoRoot,
      truth: {
        ...truth,
        body: `${truth.body} Material schedule note for v2.`,
      },
      artifactRootRel,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.identity.campaignSetRenderVersion).toBe(v1 + 1);
    expect(second.identity.plannedPostCount).toBe(6);
    expect(
      existsSync(path.join(repoRoot, first.identity.calendarRelativePath)),
    ).toBe(true);
    expect(
      existsSync(path.join(repoRoot, second.identity.calendarRelativePath)),
    ).toBe(true);
    expect(first.identity.calendarRelativePath).not.toBe(
      second.identity.calendarRelativePath,
    );
  }, 300_000);

  it("fail-closed: partial set, caption, calendar, date governance, count, plate — no N shrink", async () => {
    const truth = buildHarborOakSm001ProjectTruth({
      repoRoot,
      richness: "full",
      campaignId: "camp-design-sm-001-proof-fail",
    });
    expect(truth.plannedPostCount).toBe(6);

    const partial = await runSm001ProofPipeline({
      repoRoot,
      truth: {
        ...truth,
        campaignId: "camp-design-sm-001-proof-fail-partial",
      },
      artifactRootRel: `${SM_001_PROOF_ARTIFACT_ROOT}-fail-partial`,
      forcePartialExportFail: true,
    });
    expect(partial.ok).toBe(false);
    if (!partial.ok) {
      expect(partial.failureCode).toBe("PARTIAL_SET_FAILURE");
      expect(partial.plannedPostCount).toBe(6);
    }

    const missingCaption = await runSm001ProofPipeline({
      repoRoot,
      truth: {
        ...truth,
        campaignId: "camp-design-sm-001-proof-fail-caption",
      },
      artifactRootRel: `${SM_001_PROOF_ARTIFACT_ROOT}-fail-caption`,
      forceMissingCaption: true,
    });
    expect(missingCaption.ok).toBe(false);
    if (!missingCaption.ok) {
      expect(["CAPTION_FAILURE", "BINDING_FAILURE"]).toContain(
        missingCaption.failureCode,
      );
      expect(missingCaption.plannedPostCount).toBe(6);
    }

    const badBind = await runSm001ProofPipeline({
      repoRoot,
      truth: {
        ...truth,
        campaignId: "camp-design-sm-001-proof-fail-bind",
      },
      artifactRootRel: `${SM_001_PROOF_ARTIFACT_ROOT}-fail-bind`,
      forceCaptionBindFail: true,
    });
    expect(badBind.ok).toBe(false);
    if (!badBind.ok) {
      expect(badBind.failureCode).toBe("BINDING_FAILURE");
      expect(badBind.plannedPostCount).toBe(6);
    }

    const dateOut = await runSm001ProofPipeline({
      repoRoot,
      truth: {
        ...truth,
        campaignId: "camp-design-sm-001-proof-fail-date",
      },
      artifactRootRel: `${SM_001_PROOF_ARTIFACT_ROOT}-fail-date`,
      forceDateOutsideWindow: true,
    });
    expect(dateOut.ok).toBe(false);
    if (!dateOut.ok) {
      expect(dateOut.failureCode).toBe("DATE_GOVERNANCE_FAILURE");
      expect(dateOut.plannedPostCount).toBe(6);
    }

    const missingCal = await runSm001ProofPipeline({
      repoRoot,
      truth: {
        ...truth,
        campaignId: "camp-design-sm-001-proof-fail-cal",
      },
      artifactRootRel: `${SM_001_PROOF_ARTIFACT_ROOT}-fail-cal`,
      forceMissingCalendarEntry: true,
    });
    expect(missingCal.ok).toBe(false);
    if (!missingCal.ok) {
      expect(["CALENDAR_FAILURE", "BINDING_FAILURE"]).toContain(
        missingCal.failureCode,
      );
      expect(missingCal.plannedPostCount).toBe(6);
    }

    const countMismatch = await runSm001ProofPipeline({
      repoRoot,
      truth: {
        ...truth,
        campaignId: "camp-design-sm-001-proof-fail-count",
      },
      artifactRootRel: `${SM_001_PROOF_ARTIFACT_ROOT}-fail-count`,
      forceCountMismatch: true,
    });
    expect(countMismatch.ok).toBe(false);
    if (!countMismatch.ok) {
      expect(countMismatch.failureCode).toBe("COUNT_MISMATCH");
      expect(countMismatch.plannedPostCount).toBe(6);
    }

    const badPlate = await runSm001ProofPipeline({
      repoRoot,
      truth: {
        ...truth,
        campaignId: "camp-design-sm-001-proof-fail-plate",
      },
      artifactRootRel: `${SM_001_PROOF_ARTIFACT_ROOT}-fail-plate`,
      forceInvalidPlate: true,
    });
    expect(badPlate.ok).toBe(false);
    if (!badPlate.ok) {
      expect(badPlate.failureCode).toBe("INVALID_PLATE");
      expect(badPlate.plannedPostCount).toBe(6);
    }
  }, 360_000);

  it("advisory schedule policy works when no campaign timing constraints", async () => {
    const truth = buildHarborOakSm001ProjectTruth({
      repoRoot,
      richness: "extended",
      campaignId: "camp-design-sm-001-proof-advisory",
      timingConstraints: {},
    });
    const result = await runSm001ProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${SM_001_PROOF_ARTIFACT_ROOT}-advisory`,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.identity.calendar.dateGovernance.policy).toBe(
      "bounded_advisory_sequence",
    );
    expect(result.identity.calendar.entries).toHaveLength(5);
  }, 240_000);

  it("sm-001 primaryTool is the Studio Design Renderer; sm-001-monthly remapped too", () => {
    const resolved = resolveServiceProductionContract("sm-001");
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    expect(resolved.contract.primaryTool.toolId).toBe("studio_design_renderer");

    const monthly = resolveServiceProductionContract("sm-001-monthly");
    expect(monthly.status).toBe("resolved");
    if (monthly.status !== "resolved") return;
    expect(monthly.contract.primaryTool.toolId).toBe("studio_design_renderer");
  });

  it("six sealed lanes remain green (regression)", async () => {
    const flyer = await runDesignRendererProofPipeline({
      repoRoot,
      truth: buildHarborOakFlyerProjectTruth({ repoRoot }),
    });
    expect(flyer.ok).toBe(true);

    const card = await runBusinessCardProofPipeline({
      repoRoot,
      truth: buildHarborOakBusinessCardProjectTruth({ repoRoot }),
    });
    expect(card.ok).toBe(true);

    const menu = await runMenuProofPipeline({
      repoRoot,
      truth: buildSaltCedarMenuProjectTruthMax({ repoRoot }),
      artifactRootRel: `${MENU_PROOF_ARTIFACT_ROOT}-sm001-regression`,
    });
    expect(menu.ok).toBe(true);

    const sheet = await runServiceSheetProofPipeline({
      repoRoot,
      truth: buildHarborOakServiceSheetProjectTruthMax({ repoRoot }),
      artifactRootRel: `${SERVICE_SHEET_PROOF_ARTIFACT_ROOT}-sm001-regression`,
    });
    expect(sheet.ok).toBe(true);

    const promo = await runPromoProofPipeline({
      repoRoot,
      truth: buildHarborOakPromoCampaignSetTruth({ repoRoot }),
      artifactRootRel: `${PROMO_PROOF_ARTIFACT_ROOT}-sm001-regression`,
    });
    expect(promo.ok).toBe(true);

    const social = await runSocialPostsProofPipeline({
      repoRoot,
      truth: buildHarborOakSocialPostsSetTruth({ repoRoot }),
      artifactRootRel: `${SOCIAL_POSTS_PROOF_ARTIFACT_ROOT}-sm001-regression`,
    });
    expect(social.ok).toBe(true);
  }, 600_000);
});
