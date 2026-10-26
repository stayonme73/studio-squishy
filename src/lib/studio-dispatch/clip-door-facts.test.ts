import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { builderCopyForPackage } from "@/config/studio-customer-journey-condense-v1";
import { writeCleanTalkingHeadFixture } from "@/lib/studio-source-audio-preflight/fixtures";
import { describe, expect, it } from "vitest";

import {
  CLIP_DOOR_PACKAGE_ID,
  clipDoorIntakeAnswers,
  clipRepurposingRecordingIsNext,
  readClipAuthorizedFact,
} from "./clip-door-facts";
import { mapClipRepurposingJobTruthFromJob } from "./map-clip-repurposing-job-truth";

const qualifyingLabel =
  builderCopyForPackage("clip_repurposing").aboutProject.fields.find(
    (field) => field.name === "qualifyingSource",
  )?.label ?? "";

function doorCampaign(answers: CampaignRecord["routeMapIntake"]): CampaignRecord {
  return {
    campaignId: "door-clip",
    routeMapIntake: answers,
  } as CampaignRecord;
}

describe("current Clip door fact adapter", () => {
  it("stores customer answers once under the door namespace", () => {
    const answers = clipDoorIntakeAnswers({
      purpose: "Explain the workshop offer.",
      cta: "Visit the business site.",
      qualifyingSource: true,
      rightsConfirmed: true,
      intelligible: false,
    });
    expect(answers[`${CLIP_DOOR_PACKAGE_ID}:purpose`]).toBe("Explain the workshop offer.");
    expect(answers[`${CLIP_DOOR_PACKAGE_ID}:cta`]).toBe("Visit the business site.");
    expect(answers[`${CLIP_DOOR_PACKAGE_ID}:qualifyingSource`]).toBe(qualifyingLabel);
    expect(answers[`${CLIP_DOOR_PACKAGE_ID}:intelligible`]).toBeUndefined();
    expect(JSON.stringify(answers)).not.toContain("v2-rtu-clip-repurposing");
    expect(readClipAuthorizedFact(answers, "videoPurpose")).toBe("Explain the workshop offer.");
    expect(readClipAuthorizedFact(answers, "talkingHeadConfirm")).toBe(qualifyingLabel);
    expect(readClipAuthorizedFact(answers, "ctaText")).toBe("Visit the business site.");
  });

  it("accepts door facts without a second factory intake record", () => {
    const root = mkdtempSync(path.join(tmpdir(), "clip-door-"));
    const relative = "materials/talking-head.mp4";
    writeCleanTalkingHeadFixture(path.join(root, relative));
    const answers = clipDoorIntakeAnswers({
      purpose: "Explain the workshop offer.",
      cta: "Visit the business site.",
      mustKeep: "Keep the offer line.",
      qualifyingSource: true,
      rightsConfirmed: true,
    });
    const accepted = mapClipRepurposingJobTruthFromJob({
      repoRoot: root,
      campaign: doorCampaign({
        answers,
        submittedAt: "2026-10-09T00:00:00.000Z",
      }),
      materials: [
        {
          id: "condensed-clip-source",
          category: "photo-video",
          requirementLevel: "required",
          reviewStatus: "approved_for_use",
          contentKind: "file-metadata",
          label: "Your recording",
          reason: "Clip Repurposing",
          relatedServiceIds: ["v2-rtu-clip-repurposing"],
          uploadStatus: "stored",
          fileName: "talking-head.mp4",
          url: relative,
          useAuthorization: {
            basis: "customer_owns",
            attestedAt: "2026-10-09T00:00:00.000Z",
          },
        },
      ],
    });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.intake.ctaText).toBe("Visit the business site.");
    expect(accepted.intake.mustKeepLine).toBe("Keep the offer line.");
    expect(accepted.intake.rightsCleared).toBe(true);
  });

  it("reads the cleared customer file from the file room", () => {
    const root = mkdtempSync(path.join(tmpdir(), "clip-door-room-"));
    const objectPath =
      "clients/door/campaigns/door-clip/jobs/door-clip-job/client_material/v1/talking-head.mp4";
    const abs = path.join(root, "data", "file-room-objects", ...objectPath.split("/"));
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, "stored-customer-file");
    const answers = clipDoorIntakeAnswers({
      purpose: "Explain the workshop offer.",
      cta: "Visit the business site.",
      qualifyingSource: true,
      rightsConfirmed: true,
    });
    const accepted = mapClipRepurposingJobTruthFromJob({
      repoRoot: root,
      campaign: doorCampaign({
        answers,
        submittedAt: "2026-10-09T00:00:00.000Z",
      }),
      materials: [
        {
          id: "condensed-clip-source",
          category: "photo-video",
          requirementLevel: "required",
          reviewStatus: "approved_for_use",
          contentKind: "file-metadata",
          label: "Your recording",
          reason: "Clip Repurposing",
          relatedServiceIds: ["v2-rtu-clip-repurposing"],
          uploadStatus: "stored",
          fileName: "talking-head.mp4",
          storageRef: {
            provider: "supabase_storage",
            connectionStatus: "private_object",
            bucket: "studio-files-local",
            objectPath,
            visibilityState: "internal-only",
            originalFilename: "talking-head.mp4",
            contentType: "video/mp4",
          },
          useAuthorization: {
            basis: "customer_owns",
            attestedAt: "2026-10-09T00:00:00.000Z",
          },
        },
      ],
    });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.sourceRelativePath).toBe(`data/file-room-objects/${objectPath}`);
    expect(JSON.stringify(answers)).not.toContain("v2-rtu-clip-repurposing");
  });

  it("treats a paid Clip draft as ready for the recording without a call to action", () => {
    const answers = clipDoorIntakeAnswers({
      purpose: "Explain the workshop offer.",
      qualifyingSource: true,
      intelligible: true,
      rightsConfirmed: true,
    });
    expect(answers[`${CLIP_DOOR_PACKAGE_ID}:cta`]).toBeUndefined();
    expect(
      clipRepurposingRecordingIsNext({
        paymentReceivedAt: "2026-10-23T00:00:00.000Z",
        condensedOffer: { packageId: "clip_repurposing" },
        routeMapIntakeDraft: { answers },
      }),
    ).toBe(true);
    expect(
      clipRepurposingRecordingIsNext({
        paymentReceivedAt: "2026-10-23T00:00:00.000Z",
        condensedOffer: { packageId: "social_and_promo_graphics" },
        routeMapIntakeDraft: { answers },
      }),
    ).toBe(false);
  });

  it("does not invent a missing talking-head confirmation or CTA", () => {
    const missingConfirm = mapClipRepurposingJobTruthFromJob({
      repoRoot: process.cwd(),
      campaign: doorCampaign({
        answers: clipDoorIntakeAnswers({
          purpose: "Explain the workshop offer.",
          cta: "Visit the business site.",
          qualifyingSource: false,
          rightsConfirmed: true,
        }),
        submittedAt: "2026-10-09T00:00:00.000Z",
      }),
      materials: [],
    });
    expect(missingConfirm.ok).toBe(false);
    if (missingConfirm.ok) return;
    expect(missingConfirm.code).toBe("MISSING_REQUIRED_FACTS");

    const missingCta = mapClipRepurposingJobTruthFromJob({
      repoRoot: process.cwd(),
      campaign: doorCampaign({
        answers: clipDoorIntakeAnswers({
          purpose: "Explain the workshop offer.",
          qualifyingSource: true,
          rightsConfirmed: true,
        }),
        submittedAt: "2026-10-09T00:00:00.000Z",
      }),
      materials: [],
    });
    expect(missingCta.ok).toBe(false);
    if (missingCta.ok) return;
    expect(missingCta.code).toBe("MISSING_USABLE_SOURCE");
    expect(missingCta.message).not.toMatch(/CTA|call to action/i);
  });
});
