/**
 * STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PROOF-1
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";

import {
  buildHarborOakBusinessCardProjectTruth,
  BUSINESS_CARD_PROOF_ARTIFACT_ROOT,
} from "./card-fixtures";
import { runBusinessCardProofPipeline } from "./card-pipeline";
import {
  buildHarborOakFlyerProjectTruth,
  PROOF_ARTIFACT_ROOT,
} from "./fixtures";
import { runDesignRendererProofPipeline } from "./pipeline";
import {
  buildSaltCedarMenuProjectTruthMax,
  MENU_PROOF_ARTIFACT_ROOT,
} from "./menu-fixtures";
import { runMenuProofPipeline } from "./menu-pipeline";
import {
  buildHarborOakPromoCampaignSetTruth,
  PROMO_PROOF_ARTIFACT_ROOT,
} from "./promo-fixtures";
import { runPromoProofPipeline } from "./promo-pipeline";
import {
  buildHarborOakServiceSheetProjectTruthMax,
  SERVICE_SHEET_PROOF_ARTIFACT_ROOT,
} from "./service-sheet-fixtures";
import { runServiceSheetProofPipeline } from "./service-sheet-pipeline";
import {
  buildHarborOakSocialPostsSetTruth,
  SOCIAL_POSTS_PROOF_ARTIFACT_ROOT,
} from "./social-posts-fixtures";
import { runSocialPostsProofPipeline } from "./social-posts-pipeline";
import { buildHarborOakSm001ProjectTruth } from "./sm-001-fixtures";
import { runSm001ProofPipeline } from "./sm-001-pipeline";
import { SM_001_MONTHLY_PROOF_CONTRACT } from "./sm-001-monthly-contracts";
import {
  SM_001_MONTHLY_PROOF_ARTIFACT_ROOT,
  SM_001_MONTHLY_PROOF_CYCLE_A,
  SM_001_MONTHLY_PROOF_CYCLE_B,
  buildHarborOakSm001MonthlyProjectTruth,
} from "./sm-001-monthly-fixtures";
import {
  resolveSm001MonthlyCycleArtifactRoot,
  runSm001MonthlyProofPipeline,
} from "./sm-001-monthly-pipeline";

const repoRoot = process.cwd();

describe("STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PROOF-1", () => {
  it("contract locks cycle-keyed A wrapper; Canva remap closed; no mint", () => {
    expect(SM_001_MONTHLY_PROOF_CONTRACT.deltaClass).toBe("A");
    expect(SM_001_MONTHLY_PROOF_CONTRACT.reusesSealedSm001Engine).toBe(true);
    expect(SM_001_MONTHLY_PROOF_CONTRACT.forksMonthlyRendererFamily).toBe(false);
    expect(SM_001_MONTHLY_PROOF_CONTRACT.rendererMintsProductionCycleId).toBe(
      false,
    );
    expect(SM_001_MONTHLY_PROOF_CONTRACT.primaryToolRemapAuthorized).toBe(true);
    expect(SM_001_MONTHLY_PROOF_CONTRACT.dispatchHookAuthorized).toBe(true);
    expect(SM_001_MONTHLY_PROOF_CONTRACT.ownerRoutineResponsibility).toBe("NONE");

    const monthly = resolveServiceProductionContract("sm-001-monthly");
    expect(monthly.status).toBe("resolved");
    if (monthly.status === "resolved") {
      expect(monthly.contract.primaryTool.toolId).toBe("studio_design_renderer");
    }
  });

  it("two cycles same campaign: separate roots, no overwrite, cycle-scoped ALREADY_RENDERED", async () => {
    const campaignId = `camp-sm001m-two-cycle-${Date.now()}`;

    const truthA = buildHarborOakSm001MonthlyProjectTruth({
      repoRoot,
      cycle: SM_001_MONTHLY_PROOF_CYCLE_A,
      plannedPostCount: 4,
      campaignId,
    });
    const truthB = buildHarborOakSm001MonthlyProjectTruth({
      repoRoot,
      cycle: SM_001_MONTHLY_PROOF_CYCLE_B,
      plannedPostCount: 6,
      campaignId,
    });

    const rootA = resolveSm001MonthlyCycleArtifactRoot({
      campaignId,
      productionCycleId: SM_001_MONTHLY_PROOF_CYCLE_A.productionCycleId,
    });
    const rootB = resolveSm001MonthlyCycleArtifactRoot({
      campaignId,
      productionCycleId: SM_001_MONTHLY_PROOF_CYCLE_B.productionCycleId,
    });
    expect(rootA).not.toBe(rootB);

    const a1 = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: truthA,
      artifactRootRel: rootA,
    });
    expect(a1.ok).toBe(true);
    if (!a1.ok) return;
    expect(a1.invocationOutcome).toBe("RENDERED");
    expect(a1.receipt.productionCycleId).toBe(
      SM_001_MONTHLY_PROOF_CYCLE_A.productionCycleId,
    );
    expect(a1.identity.plannedPostCount).toBe(4);
    expect(a1.identity.assets).toHaveLength(4);
    expect(a1.identity.calendar.entries).toHaveLength(4);
    for (const e of a1.identity.calendar.entries) {
      expect(e.suggestedDate >= "2026-03-10").toBe(true);
      expect(e.suggestedDate <= "2026-03-20").toBe(true);
    }
    const aVersion = a1.identity.campaignSetRenderVersion;
    const aFp = a1.productionFingerprint;

    const b1 = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: truthB,
      artifactRootRel: rootB,
    });
    expect(b1.ok).toBe(true);
    if (!b1.ok) return;
    expect(b1.invocationOutcome).toBe("RENDERED");
    expect(b1.receipt.productionCycleId).toBe(
      SM_001_MONTHLY_PROOF_CYCLE_B.productionCycleId,
    );
    expect(b1.identity.plannedPostCount).toBe(6);
    expect(b1.identity.assets).toHaveLength(6);
    expect(b1.productionFingerprint).not.toBe(aFp);
    for (const e of b1.identity.calendar.entries) {
      expect(e.suggestedDate >= "2026-03-25").toBe(true);
      expect(e.suggestedDate <= "2026-04-15").toBe(true);
    }

    const aReceiptAfterB = JSON.parse(
      readFileSync(
        path.join(repoRoot, rootA, "monthly-cycle-receipt.json"),
        "utf8",
      ),
    ) as { productionCycleId: string; plannedPostCount: number };
    expect(aReceiptAfterB.productionCycleId).toBe(
      SM_001_MONTHLY_PROOF_CYCLE_A.productionCycleId,
    );
    expect(aReceiptAfterB.plannedPostCount).toBe(4);
    expect(
      existsSync(path.join(repoRoot, rootA, "current-identity.json")),
    ).toBe(true);
    const aIdentityAfterB = JSON.parse(
      readFileSync(path.join(repoRoot, rootA, "current-identity.json"), "utf8"),
    ) as { plannedPostCount: number; campaignSetRenderVersion: number };
    expect(aIdentityAfterB.plannedPostCount).toBe(4);
    expect(aIdentityAfterB.campaignSetRenderVersion).toBe(aVersion);

    const a2 = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: truthA,
      artifactRootRel: rootA,
    });
    expect(a2.ok).toBe(true);
    if (!a2.ok) return;
    expect(a2.invocationOutcome).toBe("ALREADY_RENDERED");

    const b2 = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: truthB,
      artifactRootRel: rootB,
    });
    expect(b2.ok).toBe(true);
    if (!b2.ok) return;
    expect(b2.invocationOutcome).toBe("ALREADY_RENDERED");

    expect(a2.artifactRootRel).not.toBe(b2.artifactRootRel);
    expect(a2.productionFingerprint).not.toBe(b2.productionFingerprint);
  }, 600_000);

  it("within-cycle material change → immutable vN+1; prior version retained", async () => {
    const campaignId = `camp-sm001m-version-${Date.now()}`;
    const root = `${resolveSm001MonthlyCycleArtifactRoot({
      campaignId,
      productionCycleId: SM_001_MONTHLY_PROOF_CYCLE_A.productionCycleId,
    })}-ver`;
    const truth = buildHarborOakSm001MonthlyProjectTruth({
      repoRoot,
      cycle: SM_001_MONTHLY_PROOF_CYCLE_A,
      plannedPostCount: 4,
      campaignId,
    });
    const first = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: root,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const v1 = first.identity.campaignSetRenderVersion;

    const second = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: {
        ...truth,
        creative: {
          ...truth.creative,
          body: `${truth.creative.body} Material note for cycle v2.`,
        },
      },
      artifactRootRel: root,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.invocationOutcome).toBe("RENDERED");
    expect(second.identity.campaignSetRenderVersion).toBe(v1 + 1);
    expect(second.receipt.productionCycleId).toBe(
      SM_001_MONTHLY_PROOF_CYCLE_A.productionCycleId,
    );
    expect(
      existsSync(path.join(repoRoot, first.identity.calendarRelativePath)),
    ).toBe(true);
  }, 300_000);

  it("fail-closed: missing cycle fields, mint attempts, immutable mutate, prior reuse, plate", async () => {
    const campaignId = `camp-sm001m-fail-${Date.now()}`;
    const base = buildHarborOakSm001MonthlyProjectTruth({
      repoRoot,
      cycle: SM_001_MONTHLY_PROOF_CYCLE_A,
      plannedPostCount: 4,
      campaignId,
    });

    const missingId = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: {
        ...base,
        cycle: { ...base.cycle, productionCycleId: "" },
      },
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-id`,
    });
    expect(missingId.ok).toBe(false);
    if (!missingId.ok) {
      expect(missingId.failureCode).toBe("MISSING_PRODUCTION_CYCLE_ID");
    }

    const currentLabel = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: {
        ...base,
        cycle: { ...base.cycle, productionCycleId: "Current cycle" },
      },
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-label`,
    });
    expect(currentLabel.ok).toBe(false);
    if (!currentLabel.ok) {
      expect(currentLabel.failureCode).toBe("MISSING_PRODUCTION_CYCLE_ID");
    }

    const missingStart = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: {
        ...base,
        cycle: { ...base.cycle, cycleStartDate: "" },
      },
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-start`,
    });
    expect(missingStart.ok).toBe(false);
    if (!missingStart.ok) {
      expect(missingStart.failureCode).toBe("MISSING_CYCLE_START");
    }

    const missingEnd = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: {
        ...base,
        cycle: { ...base.cycle, cycleEndDate: "" },
      },
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-end`,
    });
    expect(missingEnd.ok).toBe(false);
    if (!missingEnd.ok) {
      expect(missingEnd.failureCode).toBe("MISSING_CYCLE_END");
    }

    const badRange = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: {
        ...base,
        cycle: {
          ...base.cycle,
          cycleStartDate: "2026-03-31",
          cycleEndDate: "2026-03-01",
        },
      },
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-range`,
    });
    expect(badRange.ok).toBe(false);
    if (!badRange.ok) {
      expect(badRange.failureCode).toBe("INVALID_CYCLE_DATE_RANGE");
    }

    const missingFocus = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: {
        ...base,
        cycle: { ...base.cycle, monthlyContentFocus: "   " },
      },
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-focus`,
    });
    expect(missingFocus.ok).toBe(false);
    if (!missingFocus.ok) {
      expect(missingFocus.failureCode).toBe("MISSING_CYCLE_FOCUS");
    }

    const missingN = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: {
        ...base,
        plannedPostCount: undefined as unknown as 4,
      },
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-n-missing`,
    });
    expect(missingN.ok).toBe(false);
    if (!missingN.ok) {
      expect(missingN.failureCode).toBe("MISSING_PLANNED_POST_COUNT");
    }

    const badN = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: {
        ...base,
        plannedPostCount: 3 as unknown as 4,
        plannedPostCountSelection: {
          ...base.plannedPostCountSelection,
          plannedPostCount: 3 as unknown as 4,
        },
      },
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-n-bad`,
    });
    expect(badN.ok).toBe(false);
    if (!badN.ok) {
      expect(badN.failureCode).toBe("INVALID_PLANNED_POST_COUNT");
    }

    const mint = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: base,
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-mint`,
      requestedMint: { fromCurrentMonth: true },
    });
    expect(mint.ok).toBe(false);
    if (!mint.ok) {
      expect(mint.failureCode).toBe("WRAPPER_REFUSED_CYCLE_MINT");
    }

    const priorReuse = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: base,
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-prior`,
      forceReusePriorCycleIdAsCurrent:
        SM_001_MONTHLY_PROOF_CYCLE_B.productionCycleId,
    });
    expect(priorReuse.ok).toBe(false);
    if (!priorReuse.ok) {
      expect(priorReuse.failureCode).toBe("PRIOR_CYCLE_REUSE_FORBIDDEN");
    }

    const rootMut = `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-mutate`;
    const rendered = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: base,
      artifactRootRel: rootMut,
    });
    expect(rendered.ok).toBe(true);

    const mutate = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: {
        ...base,
        cycle: {
          ...base.cycle,
          cycleStartDate: "2026-02-01",
          cycleEndDate: "2026-02-28",
        },
      },
      artifactRootRel: rootMut,
    });
    expect(mutate.ok).toBe(false);
    if (!mutate.ok) {
      expect(mutate.failureCode).toBe("CYCLE_IDENTITY_IMMUTABLE");
    }

    const plate = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: {
        ...base,
        campaignId: `${campaignId}-plate`,
      },
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-plate`,
      forceInvalidPlate: true,
    });
    expect(plate.ok).toBe(false);
    if (!plate.ok) {
      expect(plate.failureCode).toBe("INVALID_PLATE");
    }

    const stale = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: {
        ...base,
        campaignId: `${campaignId}-stale`,
        creative: {
          ...base.creative,
          body: "Unrelated copy without this cycle focus token.",
          headline: "Unrelated headline",
        },
      },
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-stale`,
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) {
      expect(stale.failureCode).toBe("STALE_CYCLE_TRUTH");
    }

    const conflict = await runSm001MonthlyProofPipeline({
      repoRoot,
      truth: {
        ...base,
        campaignId: `${campaignId}-conflict`,
        creative: {
          ...base.creative,
          campaignTimingConstraints: {
            startDate: "2026-05-01",
            endDate: "2026-05-15",
          },
        },
      },
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-fail-conflict`,
    });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) {
      expect(conflict.failureCode).toBe("CYCLE_WINDOW_CONFLICT");
    }
  }, 600_000);

  it("seven sealed lanes remain green (regression)", async () => {
    void PROOF_ARTIFACT_ROOT;
    void BUSINESS_CARD_PROOF_ARTIFACT_ROOT;

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
      artifactRootRel: `${MENU_PROOF_ARTIFACT_ROOT}-sm001m-regression`,
    });
    expect(menu.ok).toBe(true);

    const sheet = await runServiceSheetProofPipeline({
      repoRoot,
      truth: buildHarborOakServiceSheetProjectTruthMax({ repoRoot }),
      artifactRootRel: `${SERVICE_SHEET_PROOF_ARTIFACT_ROOT}-sm001m-regression`,
    });
    expect(sheet.ok).toBe(true);

    const promo = await runPromoProofPipeline({
      repoRoot,
      truth: buildHarborOakPromoCampaignSetTruth({ repoRoot }),
      artifactRootRel: `${PROMO_PROOF_ARTIFACT_ROOT}-sm001m-regression`,
    });
    expect(promo.ok).toBe(true);

    const social = await runSocialPostsProofPipeline({
      repoRoot,
      truth: buildHarborOakSocialPostsSetTruth({ repoRoot }),
      artifactRootRel: `${SOCIAL_POSTS_PROOF_ARTIFACT_ROOT}-sm001m-regression`,
    });
    expect(social.ok).toBe(true);

    const sm001 = await runSm001ProofPipeline({
      repoRoot,
      truth: buildHarborOakSm001ProjectTruth({
        repoRoot,
        richness: "core",
        campaignId: "camp-sm001m-regression-sm001",
      }),
      artifactRootRel: `${SM_001_MONTHLY_PROOF_ARTIFACT_ROOT}-sm001-regression`,
    });
    expect(sm001.ok).toBe(true);
  }, 600_000);
});
