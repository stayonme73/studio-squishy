/**
 * STUDIO-OPERATING-AUTONOMOUS-PRODUCTION-LOOP-1
 * Maya autonomous certification — gated.
 *
 * Run only with STUDIO_MAYA_AUTONOMOUS=1 against the live Customer-One campaign.
 * Scout wakes the Machine. Scout does not repair Maya's PNG/HTML/spec.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import { recoverPaidOperatingChain } from "@/lib/studio-paid-activation-recovery";

const REPO = path.resolve(__dirname, "../../..");
const MAYA_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const ARTIFACT_RENDERS = path.join(
  REPO,
  "data/campaign-design-artifacts",
  MAYA_ID,
  "dd_716a15b6-d8d6-436c-8f84-9e8b40d2f959_v2-rtu-flyer",
  "renders",
);
const EVIDENCE_REL =
  "docs/launch/studio-operating-autonomous-production-loop-1/MAYA-AUTONOMOUS-CERT-EVIDENCE.json";

function pngHash(version: number): string | null {
  const abs = path.join(ARTIFACT_RENDERS, `v${version}`, "flyer.png");
  if (!existsSync(abs)) return null;
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function existingVersions(): number[] {
  if (!existsSync(ARTIFACT_RENDERS)) return [];
  return readdirSync(ARTIFACT_RENDERS)
    .map((name) => {
      const m = /^v(\d+)$/.exec(name);
      return m ? Number(m[1]) : null;
    })
    .filter((n: number | null): n is number => n != null)
    .sort((a: number, b: number) => a - b);
}

const gated = process.env.STUDIO_MAYA_AUTONOMOUS === "1";

describe.skipIf(!gated)(
  "STUDIO-OPERATING-AUTONOMOUS-PRODUCTION-LOOP-1 Maya autonomous cert",
  () => {
    it(
      "wakes Maya through Machine production correction — Scout does not repair creative",
      async () => {
        const beforeEnvelope = await readCampaignEnvelope(MAYA_ID);
        expect(beforeEnvelope?.record).toBeTruthy();
        const before = beforeEnvelope!.record;
        const beforeTasks = await readTasksEnvelope(MAYA_ID);
        const flyerJob = beforeTasks?.jobRecords?.find(
          (job) => job.skuId === "v2-rtu-flyer",
        );
        const priorVersions = existingVersions();
        const priorHashes = Object.fromEntries(
          priorVersions.map((v) => [String(v), pngHash(v)]),
        );
        const beforeAnswers = {
          ...(before.routeMapIntake?.answers ?? {}),
        };
        const beforeRevisionsUsed = before.revisionRoundsUsed;
        const beforeRevisionsIncluded = before.revisionRoundsIncluded;

        const recovered = await recoverPaidOperatingChain(before);
        const afterEnvelope = await readCampaignEnvelope(MAYA_ID);
        const after = afterEnvelope?.record ?? recovered.campaign;
        const afterTasks = await readTasksEnvelope(MAYA_ID);
        const afterJob = afterTasks?.jobRecords?.find(
          (job) => job.skuId === "v2-rtu-flyer",
        );
        const loop =
          after.internalProductionLoop ??
          recovered.campaign.internalProductionLoop ??
          null;

        for (const version of priorVersions) {
          expect(pngHash(version)).toBe(priorHashes[String(version)]);
        }
        expect(after.routeMapIntake?.answers).toEqual(beforeAnswers);
        expect(after.revisionRoundsUsed).toBe(beforeRevisionsUsed);
        expect(after.revisionRoundsIncluded).toBe(beforeRevisionsIncluded);

        const laterVersions = existingVersions().filter(
          (v) => !priorVersions.includes(v),
        );
        const reviewOpen = afterJob
          ? canClientAccessJobReview(afterJob)
          : false;

        const evidence = {
          packageId: "STUDIO-OPERATING-AUTONOMOUS-PRODUCTION-LOOP-1",
          fixture: "Maya’s Mobile Boutique",
          scoutRepairedArtifact: false,
          scoutRewroteCopy: false,
          campaignId: MAYA_ID,
          recovery: {
            ok: recovered.ok,
            reason: recovered.reason,
            lastError: recovered.lastError ?? null,
          },
          before: {
            campaignStatus: before.campaignStatus,
            spineStatus: flyerJob?.spineStatus ?? null,
            reviewOpen: flyerJob
              ? canClientAccessJobReview(flyerJob)
              : false,
            revisionRoundsUsed: beforeRevisionsUsed,
            priorRenderVersions: priorVersions,
            priorPngSha256: priorHashes,
          },
          after: {
            campaignStatus: after.campaignStatus,
            spineStatus: afterJob?.spineStatus ?? null,
            reviewOpen,
            readyForReviewAutonomous:
              afterJob?.spineStatus === "ready_for_review" && reviewOpen,
            revisionRoundsUsed: after.revisionRoundsUsed,
            newRenderVersions: laterVersions,
            newPngSha256: Object.fromEntries(
              laterVersions.map((v) => [String(v), pngHash(v)]),
            ),
          },
          loop,
          observerFlyer:
            after.dispatchExecution?.designRendererObserver?.results.find(
              (result) => result.skuId === "v2-rtu-flyer",
            ) ?? null,
          note: "Scout invoked recoverPaidOperatingChain only. Prior v1–v6 PNG hashes must remain unchanged.",
        };
        const evidenceAbs = path.join(REPO, EVIDENCE_REL);
        const shouldWriteEvidence = laterVersions.length > 0 || !existsSync(evidenceAbs);
        if (shouldWriteEvidence) {
          mkdirSync(path.dirname(evidenceAbs), { recursive: true });
          writeFileSync(evidenceAbs, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
        }

        expect(loop).toBeTruthy();
        expect(loop!.attempts.length).toBeGreaterThan(0);
        expect(after.revisionRoundsUsed).toBe(0);
      },
      180_000,
    );
  },
);
