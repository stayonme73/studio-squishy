import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { projectIntakeServiceFieldKey } from "@/lib/project-intake-plan";

import { mapFootageEditingJobTruthFromJob } from "./map-footage-editing-job-truth";
import { SHORT_FORM_DOOR_PACKAGE_ID } from "./short-form-door-facts";

const REPO = path.resolve(__dirname, "../../..");
const DOOR = SHORT_FORM_DOOR_PACKAGE_ID;

function doorCampaign(
  campaignId: string,
  answers: Record<string, string>,
): CampaignRecord {
  return {
    campaignId,
    routeMapIntake: { answers, submittedAt: "2026-10-10T00:00:00.000Z" },
  } as CampaignRecord;
}

function doorAnswers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    [projectIntakeServiceFieldKey(DOOR, "purpose")]:
      "Show how a finished page should feel organized.",
    [projectIntakeServiceFieldKey(DOOR, "markedMoments")]:
      "I am sending up to 3 English clips or marked moments. Each one is 45 seconds or less, and I have marked the moments to use.",
    [projectIntakeServiceFieldKey(DOOR, "usableFootage")]:
      "The footage and audio are clear enough to use.",
    [projectIntakeServiceFieldKey(DOOR, "rights")]:
      "I own these clips, or I have permission from everyone who appears in them.",
    [projectIntakeServiceFieldKey(DOOR, "cta")]: "Visit the business site.",
    [projectIntakeServiceFieldKey(DOOR, "mustKeep")]: "The process should stay organized.",
    ...extra,
  };
}

describe("short-form current-door facts", () => {
  it("reads door answers and one file-room clip without a factory-key intake", () => {
    const campaignId = "short-form-door-map";
    const objectPath = `${campaignId}/materials/selected-clip.mp4`;
    const rel = `data/file-room-objects/${objectPath}`;
    const abs = path.join(REPO, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, Buffer.from("clip-bytes"));

    const mapped = mapFootageEditingJobTruthFromJob({
      repoRoot: REPO,
      campaign: doorCampaign(campaignId, doorAnswers()),
      materials: [
        {
          id: "condensed-short-source-1",
          category: "photo-video",
          requirementLevel: "required",
          reviewStatus: "submitted",
          contentKind: "file-metadata",
          label: "Selected clip 1",
          reason: "Short-Form Video Editing",
          relatedServiceIds: [DOOR],
          uploadStatus: "stored",
          submittedAt: "2026-10-10T00:00:00.000Z",
          fileName: "selected-clip.mp4",
          storageRef: { provider: "supabase_storage", objectPath, checksumSha256: "abc" },
          useAuthorization: {
            basis: "customer_owns",
            attestedAt: "2026-10-10T00:00:00.000Z",
          },
          contentCertification: {
            productionCleared: true,
            routingState: "CLEARED_FOR_PRODUCTION",
          },
        } as CampaignMaterialItem,
      ],
    });

    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.intake.ctaText).toBe("Visit the business site.");
    expect(mapped.intake.mustKeepLine).toBe("The process should stay organized.");
    expect(mapped.intake.rightsCleared).toBe(true);
    expect(mapped.sourceRelativePath).toBe(rel);
  });

  it("does not invent a call to action when the door left it blank", () => {
    const answers = doorAnswers();
    delete answers[projectIntakeServiceFieldKey(DOOR, "cta")];
    const mapped = mapFootageEditingJobTruthFromJob({
      repoRoot: REPO,
      campaign: doorCampaign("short-form-door-no-cta", answers),
      materials: [],
    });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.code).toBe("MISSING_USABLE_SOURCE");
    expect(mapped.message).not.toMatch(/call-to-action/i);
  });

  it("requires the usable-footage confirmation on the current door", () => {
    const answers = doorAnswers();
    delete answers[projectIntakeServiceFieldKey(DOOR, "usableFootage")];
    const mapped = mapFootageEditingJobTruthFromJob({
      repoRoot: REPO,
      campaign: doorCampaign("short-form-door-no-usable", answers),
      materials: [],
    });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.code).toBe("MISSING_REQUIRED_FACTS");
  });
});
