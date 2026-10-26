import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  currentDoorCustomerFacingText,
  studioShortFormCurrentDoorContractV1,
  studioShortFormObsoleteContractIsolatedV1,
} from "@/config/studio-short-form-current-door-contract-v1";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { projectIntakeServiceFieldKey } from "@/lib/project-intake-plan";
import {
  renderUseGuideMarkdown,
  writePackPostCaption,
  writePackUseGuide,
} from "@/lib/studio-short-form-content-pack/extras";
import { evaluateContentPackIntake } from "@/lib/studio-short-form-content-pack/intake";
import { emptyPackRevisionLedger } from "@/lib/studio-short-form-content-pack/revision";
import { evaluateFootageIntake } from "@/lib/studio-short-form-video-editing/gates";
import { buildEditDecisionList } from "@/lib/studio-short-form-video-editing/edl";
import {
  TALKING_HEAD_INTAKE,
  TALKING_HEAD_WORDS,
} from "@/lib/studio-short-form-video-editing/talking-head-fixture";

import { evaluateJobDispatch } from "./evaluate";
import { invokeFootageEditingDispatchHook } from "./footage-editing-dispatch-hook";
import { mapFootageEditingJobTruthFromJob } from "./map-footage-editing-job-truth";
import {
  emptyCurrentDoorRevisionLedger,
  evaluateCurrentDoorRevision,
} from "./short-form-current-door-job";
import { SHORT_FORM_DOOR_PACKAGE_ID } from "./short-form-door-facts";

const REPO = path.resolve(__dirname, "../../..");
const DOOR = SHORT_FORM_DOOR_PACKAGE_ID;
const SKU = SHORT_FORM_VIDEO_EDITING_SKU;

function doorCampaign(campaignId: string, cta?: string, mustKeep?: string): CampaignRecord {
  const answers: Record<string, string> = {
    [projectIntakeServiceFieldKey(DOOR, "purpose")]:
      "Polish one marked English clip into a short video people can follow.",
    [projectIntakeServiceFieldKey(DOOR, "markedMoments")]:
      "I am sending up to 3 English clips or marked moments. Each one is 45 seconds or less, and I have marked the moments to use.",
    [projectIntakeServiceFieldKey(DOOR, "usableFootage")]:
      "The footage and audio are clear enough to use.",
    [projectIntakeServiceFieldKey(DOOR, "rights")]:
      "I own these clips, or I have permission from everyone who appears in them.",
  };
  if (cta) answers[projectIntakeServiceFieldKey(DOOR, "cta")] = cta;
  if (mustKeep) answers[projectIntakeServiceFieldKey(DOOR, "mustKeep")] = mustKeep;
  return {
    campaignId,
    routeMapIntake: { answers, submittedAt: "2026-10-10T00:00:00.000Z" },
  } as CampaignRecord;
}

function clearedClip(
  campaignId: string,
  index: number,
): { item: CampaignMaterialItem; rel: string } {
  const fileName = `selected-clip-${index}.mp4`;
  const objectPath = `${campaignId}/materials/${fileName}`;
  const rel = `data/file-room-objects/${objectPath}`;
  const abs = path.join(REPO, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, Buffer.from(`clip-${index}`));
  return {
    rel,
    item: {
      id: `condensed-short-source-${index}`,
      category: "photo-video",
      requirementLevel: index === 1 ? "required" : "optional",
      reviewStatus: "submitted",
      contentKind: "file-metadata",
      label: `Selected clip ${index}`,
      reason: "Short-Form Video Editing",
      relatedServiceIds: [DOOR],
      uploadStatus: "stored",
      submittedAt: "2026-10-10T00:00:00.000Z",
      fileName,
      storageRef: { provider: "supabase_storage", objectPath, checksumSha256: `abc${index}` },
      useAuthorization: { basis: "customer_owns", attestedAt: "2026-10-10T00:00:00.000Z" },
      contentCertification: {
        productionCleared: true,
        routingState: "CLEARED_FOR_PRODUCTION",
      },
    } as CampaignMaterialItem,
  };
}

describe("current-door Short-Form contract", () => {
  it("keeps the sold product off the obsolete $349 one-video contract", () => {
    const facing = currentDoorCustomerFacingText();
    expect(facing).toContain("Short-Form Video Editing");
    expect(facing).toContain("$186.25");
    expect(facing).toContain("Three revision rounds");
    expect(facing).not.toMatch(/349|Content Pack|one revision/i);
    expect(studioShortFormCurrentDoorContractV1.listPriceCents).toBe(18625);
    expect(studioShortFormCurrentDoorContractV1.thankYouDiscountCents).toBe(3725);
    expect(studioShortFormCurrentDoorContractV1.amountDueCents).toBe(14900);
    expect(studioShortFormCurrentDoorContractV1.revisionRounds).toBe(3);
    expect(studioShortFormCurrentDoorContractV1.sourceMax).toBe(3);
    expect(studioShortFormCurrentDoorContractV1.ctaOptional).toBe(true);
    expect(studioShortFormObsoleteContractIsolatedV1.listPriceCents).toBe(34900);
    expect(studioShortFormObsoleteContractIsolatedV1.revisionRounds).toBe(1);
    expect(studioShortFormVideoEditingBuildV1.sku.priceCents).toBe(34900);
    expect(studioShortFormVideoEditingBuildV1.offer.includedRevisions).toBe(1);
    expect(emptyPackRevisionLedger().included).toBe(1);
  });

  it("represents 1, 2, and 3 sources and refuses a fourth", () => {
    for (const count of [1, 2, 3] as const) {
      const campaignId = `short-form-contract-${count}`;
      const clips = Array.from({ length: count }, (_, index) =>
        clearedClip(campaignId, index + 1),
      );
      const mapped = mapFootageEditingJobTruthFromJob({
        repoRoot: REPO,
        campaign: doorCampaign(campaignId),
        materials: clips.map((clip) => clip.item),
      });
      expect(mapped.ok).toBe(true);
      if (!mapped.ok || !mapped.currentDoor) {
        throw new Error(`count ${count} did not represent the current door`);
      }
      expect(mapped.currentDoor.sourceCount).toBe(count);
      expect(mapped.currentDoor.outputs.videos).toHaveLength(count);
      expect(mapped.currentDoor.outputs.postCaptions).toHaveLength(count);
      expect(mapped.currentDoor.outputs.coverTitleGraphics).toHaveLength(count);
      expect(mapped.currentDoor.outputs.postingGuide.count).toBe(1);
      expect(mapped.currentDoor.outputs.coverTitleGraphics[0]?.eyebrow).toBe(
        "Short-Form Video Editing",
      );
      expect(mapped.currentDoor.cta).toEqual({
        supplied: false,
        text: null,
        treatment: "none",
        endCard: false,
      });
      expect(mapped.currentDoor.mustKeep).toBeNull();
      expect(mapped.currentDoor.productionStarted).toBe(false);
      expect(mapped.currentDoor.revisionRounds).toBe(3);
      expect(JSON.stringify(mapped.currentDoor)).not.toMatch(/349|Content Pack/);
      rmSync(path.join(REPO, "data/file-room-objects", campaignId), {
        recursive: true,
        force: true,
      });
    }

    const campaignId = "short-form-contract-4";
    const extra = Array.from({ length: 4 }, (_, index) => clearedClip(campaignId, index + 1));
    const refused = mapFootageEditingJobTruthFromJob({
      repoRoot: REPO,
      campaign: doorCampaign(campaignId),
      materials: extra.map((clip) => clip.item),
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.code).toBe("TOO_MANY_SOURCES");
    rmSync(path.join(REPO, "data/file-room-objects", campaignId), {
      recursive: true,
      force: true,
    });
  });

  it("preserves a supplied call to action and omits one that was not given", () => {
    const supplied = "Book the marked moment.";
    const caption = writePackPostCaption({
      clipId: "clip-1",
      spokenIdea: "The finished video should be easy to follow",
      facts: [],
      ctaText: supplied,
    });
    expect(caption).toMatchObject({ text: expect.stringContaining(supplied) });
    const guide = writePackUseGuide({
      clipLabels: [
        {
          clipId: "clip-1",
          label: "Marked moment",
          spokenIdea: "The finished video should be easy to follow",
        },
      ],
      ctaText: supplied,
    });
    expect(guide).toMatchObject({
      ctaGuidance: `End each post with the customer CTA: ${supplied}`,
    });
    if ("ok" in guide && guide.ok === false) return;
    expect(
      renderUseGuideMarkdown(guide, studioShortFormCurrentDoorContractV1.postingGuideTitle),
    ).toContain("How to use these Short-Form Video Editing files");

    const blankCaption = writePackPostCaption({
      clipId: "clip-1",
      spokenIdea: "The finished video should be easy to follow",
      facts: [],
      ctaText: "  ",
    });
    expect(blankCaption).toMatchObject({
      text: "The finished video should be easy to follow.",
    });
    const blankGuide = writePackUseGuide({
      clipLabels: [
        {
          clipId: "clip-1",
          label: "Marked moment",
          spokenIdea: "The finished video should be easy to follow",
        },
      ],
      ctaText: "",
    });
    expect(blankGuide).toMatchObject({
      ctaGuidance: "This set does not include a call to action.",
    });
    expect(evaluateContentPackIntake({
      skuId: SKU,
      ctaText: "",
      language: "en",
      rightsCleared: true,
      supportedFacts: [],
      clips: [
        {
          id: "clip-1",
          label: "Marked moment",
          sourceRelativePath: "data/file-room-objects/clip-1.mp4",
          rightsCleared: true,
        },
      ],
    })).toBeNull();

    const noCard = evaluateFootageIntake({
      ...TALKING_HEAD_INTAKE,
      ctaText: "",
      ctaTreatment: "none",
    });
    expect(noCard).toBeNull();
    const edl = buildEditDecisionList({
      words: TALKING_HEAD_WORDS,
      intake: { ...TALKING_HEAD_INTAKE, ctaText: "", ctaTreatment: "none" },
      sourceDurationSeconds: 52,
    });
    expect(edl.ok).toBe(true);
    if (!edl.ok) return;
    expect(edl.captions.some((caption) => caption.role === "cta")).toBe(false);
  });

  it("counts three revision rounds for this package and still leaves the old pack at one", () => {
    let ledger = emptyCurrentDoorRevisionLedger();
    expect(ledger.included).toBe(3);
    for (let round = 0; round < 3; round += 1) {
      const next = evaluateCurrentDoorRevision(ledger, {
        kind: "change_music",
        note: "Soften the music.",
      });
      expect(next.ok).toBe(true);
      if (next.ok) ledger = next.nextLedger;
    }
    expect(ledger.remaining).toBe(0);
    const fourth = evaluateCurrentDoorRevision(ledger, {
      kind: "change_music",
      note: "Soften the music again.",
    });
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) {
      expect(fourth.message).toMatch(/three included revision rounds/i);
    }
  });

  it("holds the paid hook before a one-file render", async () => {
    const campaignId = "short-form-contract-hold";
    const clip = clearedClip(campaignId, 1);
    const mapped = mapFootageEditingJobTruthFromJob({
      repoRoot: REPO,
      campaign: doorCampaign(campaignId, "Book the marked moment.", "Keep the opening line."),
      materials: [clip.item],
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) expect(mapped.currentDoor?.mustKeep).toBe("Keep the opening line.");
    let pipelineCalled = false;
    const jobId = `${campaignId}::${SKU}`;
    const record = evaluateJobDispatch({
      campaignId,
      routing: {
        decisionId: `rd:${jobId}`,
        jobId,
        campaignId,
        skuId: SKU,
        status: "READY_FOR_DISPATCH",
        readyForDispatch: true,
        productionFamilyId: "video_audio",
        controlLane: "heavy",
        factFingerprint: "fp-short-form-hold",
        capabilityReadiness: "contract_ready",
        evaluatedAt: "2026-10-10T00:00:00.000Z",
        reason: null,
        blocker: null,
        ownerActionRequired: false,
      },
      jobId,
      skuId: SKU,
    });
    const held = await invokeFootageEditingDispatchHook({
      repoRoot: REPO,
      campaign: doorCampaign(campaignId, "Book the marked moment.", "Keep the opening line."),
      dispatchRecord: record,
      materials: [clip.item],
      runPipeline: async () => {
        pipelineCalled = true;
        throw new Error("production started");
      },
    });
    expect(pipelineCalled).toBe(false);
    expect(held.ok).toBe(false);
    if (!held.ok) expect(held.failureCode).toBe("SHORT_FORM_SET_PRODUCTION_HELD");
    rmSync(path.join(REPO, "data/file-room-objects", campaignId), {
      recursive: true,
      force: true,
    });
  });
});
