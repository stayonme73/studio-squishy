/**
 * Owner-authorized Maya Studio-expense remint.
 * Gated. Scout wakes the Machine. Scout does not edit Maya's PNG/HTML/spec.
 *
 * Run: STUDIO_MAYA_STUDIO_EXPENSE_REMINT=1 npx vitest run src/lib/studio-dispatch/maya-studio-quality-correction.test.ts
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import { deriveCorrectionAccounting } from "@/lib/job-control/correction-round-ledger";
import type { FlyerDesignSpec } from "@/lib/studio-design-renderer/types";
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
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/MAYA-STUDIO-QUALITY-CORRECTION-EVIDENCE.json";

function pngHash(version: number): string | null {
  const abs = path.join(ARTIFACT_RENDERS, `v${version}`, "flyer.png");
  if (!existsSync(abs)) return null;
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function existingVersions(): number[] {
  if (!existsSync(ARTIFACT_RENDERS)) return [];
  return readdirSync(ARTIFACT_RENDERS)
    .map((name) => {
      const match = /^v(\d+)$/.exec(name);
      return match ? Number(match[1]) : null;
    })
    .filter((n: number | null): n is number => n != null)
    .sort((a, b) => a - b);
}

function readSpec(version: number): FlyerDesignSpec | null {
  const abs = path.join(ARTIFACT_RENDERS, `v${version}`, "design-spec.json");
  if (!existsSync(abs)) return null;
  return JSON.parse(readFileSync(abs, "utf8")) as FlyerDesignSpec;
}

function readQa(version: number): { ok?: boolean; error?: string; evaluation?: { findings?: { id: string }[] } } | null {
  const abs = path.join(ARTIFACT_RENDERS, `v${version}`, "flyer.design-qa.json");
  if (!existsSync(abs)) return null;
  return JSON.parse(readFileSync(abs, "utf8")) as {
    ok?: boolean;
    error?: string;
    evaluation?: { findings?: { id: string }[] };
  };
}

const gated = process.env.STUDIO_MAYA_STUDIO_EXPENSE_REMINT === "1";

describe.skipIf(!gated)(
  "Maya Studio-expense quality correction",
  () => {
    it(
      "wakes Machine remint without consuming Maya's customer revision",
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
        const beforeUsed = before.revisionRoundsUsed ?? 0;
        const beforeIncluded = before.revisionRoundsIncluded ?? 0;
        const beforeAccounting = deriveCorrectionAccounting({
          campaign: before,
          envelope: beforeTasks ?? { jobCorrectionUses: [], jobCorrectionExtraGrants: [] },
        });

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
        const laterVersions = existingVersions().filter(
          (v) => !priorVersions.includes(v),
        );
        const currentVersion = afterJob?.internalQaReviewAuthorization?.workVersionId
          ?.match(/(\d+)\s*$/)?.[1]
          ? Number(
              afterJob.internalQaReviewAuthorization.workVersionId.match(/(\d+)\s*$/)?.[1],
            )
          : laterVersions.at(-1) ?? null;
        const spec = currentVersion ? readSpec(currentVersion) : null;
        const qa = currentVersion ? readQa(currentVersion) : null;
        const afterAccounting = deriveCorrectionAccounting({
          campaign: after,
          envelope: afterTasks ?? { jobCorrectionUses: [], jobCorrectionExtraGrants: [] },
        });
        const reviewOpen = afterJob ? canClientAccessJobReview(afterJob) : false;

        const evidence = {
          packageId: "STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1",
          fixture: "Maya’s Mobile Boutique",
          machineTrigger: "recoverPaidOperatingChain",
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
            workVersionId: flyerJob?.internalQaReviewAuthorization?.workVersionId ?? null,
            revisionRoundsUsed: beforeUsed,
            revisionRoundsIncluded: beforeIncluded,
            accountingRemaining: beforeAccounting.remaining,
            priorRenderVersions: priorVersions,
            priorPngSha256: priorHashes,
            loopStatus: before.internalProductionLoop?.status ?? null,
            loopOrigin: before.internalProductionLoop?.origin ?? null,
          },
          after: {
            campaignStatus: after.campaignStatus,
            spineStatus: afterJob?.spineStatus ?? null,
            workVersionId: afterJob?.internalQaReviewAuthorization?.workVersionId ?? null,
            reviewOpen,
            revisionRoundsUsed: after.revisionRoundsUsed,
            revisionRoundsIncluded: after.revisionRoundsIncluded,
            accountingRemaining: afterAccounting.remaining,
            correctionUses: afterAccounting.history.length,
            newRenderVersions: laterVersions,
            newPngSha256: Object.fromEntries(
              laterVersions.map((v) => [String(v), pngHash(v)]),
            ),
            currentVersion,
            qaOk: qa?.ok ?? null,
            qaError: qa?.error ?? null,
            qaFindings: qa?.evaluation?.findings?.map((finding) => finding.id) ?? [],
          },
          loop,
          observerFlyer:
            after.dispatchExecution?.designRendererObserver?.results.find(
              (result) => result.skuId === "v2-rtu-flyer",
            ) ?? null,
        };
        const evidenceAbs = path.join(REPO, EVIDENCE_REL);
        mkdirSync(path.dirname(evidenceAbs), { recursive: true });
        writeFileSync(evidenceAbs, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

        expect(after.revisionRoundsUsed).toBe(beforeUsed);
        expect(after.revisionRoundsIncluded).toBe(beforeIncluded);
        expect(afterAccounting.remaining).toBe(0);
        expect(pngHash(8)).toBe(priorHashes["8"]);
        expect(pngHash(10)).toBe(priorHashes["10"]);
        if (priorHashes["12"]) {
          expect(pngHash(12)).toBe(priorHashes["12"]);
        }
        expect(recovered.ok).toBe(true);
        expect(laterVersions.length).toBeGreaterThan(0);
        expect(qa?.ok).toBe(true);
        expect(reviewOpen).toBe(true);
        expect(afterJob?.spineStatus).toBe("ready_for_review");
        if (spec) {
          const headline = spec.layers.find(
            (layer) => layer.type === "text" && layer.role === "headline",
          );
          const cta = spec.layers.find(
            (layer) => layer.type === "text" && layer.role === "cta",
          );
          if (headline?.type === "text" && cta?.type === "text") {
            expect(headline.content.trim().toLowerCase()).not.toBe(
              cta.content.trim().toLowerCase(),
            );
          } else {
            expect(cta).toBeUndefined();
          }
          const footer = spec.layers.find(
            (layer) => layer.type === "shape" && layer.id === "footer-band",
          );
          if (footer?.type === "shape") {
            expect(footer.height).toBeLessThan(500);
          }
        }
        expect(qa?.evaluation?.findings?.map((finding) => finding.id) ?? []).not.toContain(
          "duplicate_headline_cta",
        );
        expect(qa?.evaluation?.findings?.map((finding) => finding.id) ?? []).not.toContain(
          "hollow_field_plate",
        );
      },
      180_000,
    );
  },
);
