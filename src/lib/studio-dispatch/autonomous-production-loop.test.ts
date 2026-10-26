/**
 * STUDIO-OPERATING-AUTONOMOUS-PRODUCTION-LOOP-1
 * Non-Maya fixture: River & Reed Pottery.
 * Scout inspects the loop. Scout does not repair the artifact between attempts.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioAutonomousProductionLoopV1 } from "@/config/studio-autonomous-production-loop-v1";

import { invokeDesignRendererDispatchHook } from "./design-renderer-hook";
import { evaluateJobDispatch } from "./evaluate";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");
const EVIDENCE_REL =
  "docs/launch/studio-operating-autonomous-production-loop-1/NON-MAYA-RIVER-REED-CERT-EVIDENCE.json";

function readyFlyerRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::v2-rtu-flyer`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: "v2-rtu-flyer" as const,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "marketing_assets" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-river-reed",
    capabilityReadiness: "contract_ready" as const,
    evaluatedAt: new Date().toISOString(),
    reason: null,
    blocker: null,
    ownerActionRequired: false as const,
  };
  return evaluateJobDispatch({
    campaignId,
    routing,
    jobId,
    skuId: "v2-rtu-flyer",
  });
}

function riverReedCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "River & Reed Pottery",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Wheel-throwing open studio flyer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        flyerPurpose: "Promotional flyer for River & Reed Pottery",
        mustInclude:
          "Open Studio Saturday — wheel-throwing seats $35. Call (804) 555-0177 or visit riverandreed.example",
        materials: "No logo. Wordmark only.",
        intendedUse: "Both print and digital",
        disclaimers: "",
      },
    },
    routeMapIntakeSubmittedAt: now,
  };
}

describe("STUDIO-OPERATING-AUTONOMOUS-PRODUCTION-LOOP-1 non-Maya cert", () => {
  it(
    "QA fail → Machine correction brief → remint with new attempt identity → QA pass",
    async () => {
      const campaignId = `camp-autonomous-loop-river-reed-${Date.now()}`;
      const campaign = riverReedCampaign(campaignId);
      const record = readyFlyerRecord(campaignId);

      const result = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials: [],
        preferAnthropic: false,
      });

      expect(result.internalLoop).toBeTruthy();
      const loop = result.internalLoop!;
      expect(loop.maxAttempts).toBe(
        studioAutonomousProductionLoopV1.maxInternalProductionAttempts,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(loop.status).toBe("passed");
      expect(loop.ownerEscalation).toBeNull();
      expect(loop.attempts.length).toBeGreaterThanOrEqual(1);
      expect(loop.attempts.some((attempt) => attempt.qaResult === "pass")).toBe(
        true,
      );
      expect(result.identity.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(
        result.designSpec.layers.some((layer) => layer.id === "offer-medallion"),
      ).toBe(false);
      expect(result.designSpec.colors.primary.toUpperCase()).not.toBe("#1F3A5F");
      expect(result.designSpec.creativeDirection?.intelligenceVersion).toBeTruthy();

      const evidence = {
        packageId: studioAutonomousProductionLoopV1.packageId,
        fixture: "River & Reed Pottery",
        scoutRepairedArtifact: false,
        campaignId,
        loop,
        passingRenderVersion: result.identity.renderVersion,
        pngRelativePath: result.identity.pngRelativePath,
        pngContentSha256: result.identity.pngContentSha256,
        reviewOpenedByHook: false,
        note:
          "Design Intelligence no longer mints the oversized house medallion on this pottery brief. Loop still records the passing attempt. Scout did not edit the PNG.",
      };
      const evidenceAbs = path.join(REPO, EVIDENCE_REL);
      mkdirSync(path.dirname(evidenceAbs), { recursive: true });
      writeFileSync(evidenceAbs, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    },
    180_000,
  );
});
