import { describe, expect, it } from "vitest";

import { studioSinglePageOwnerWorkAndAttentionConsoleV1 } from "@/config/studio-single-page-owner-work-and-attention-console-v1";
import { studioDemoVideo1OwnerConsoleV1 as cfg } from "@/config/studio-demo-video-1-owner-console-v1";
import { ownerDeskRecord } from "@/lib/studio-customer-ready/owner-desk-records";
import {
  applyOwnerTrayAction,
  seedOwnerTrayState,
} from "@/lib/studio-customer-ready/owner-decision-tray";
import { homepageDemo } from "@/config/studio-homepage-lobby-rebuild-v1";
import {
  applyVideo1OwnerJudgment,
  raiseVideo1OwnerJudgment,
  video1QualityMayRaiseOwnerJudgment,
  video1ScoutMayIntegrate,
} from "@/lib/studio-demo-video-1/owner-console-judgment";

const passed: Parameters<typeof raiseVideo1OwnerJudgment>[1] = {
  classification: "A",
  runtime: "32s",
  qaResult: "Full-watch pass. Finished short plays. Motion, not slideshow.",
  explicitLimits: ["ElevenLabs still unavailable. Reference VO only."],
  audioStatus: "Reference VO. Not final-quality audio.",
  sourceConcept: "Locked presenter talking-head source.",
  presenterConsistency: "Same locked presenter. No remint.",
  packageTruth: "Up to 5 shorts. 3 shown. No extra deliverables.",
};

describe("Video 1 Owner Console retrieval", () => {
  it("keeps the telemetry console parked and does not invent a customer campaign", () => {
    expect(studioSinglePageOwnerWorkAndAttentionConsoleV1.status).toBe(
      "PARKED / HOLD",
    );
    expect(cfg.telemetryConsoleStaysParked).toBe(true);
    expect(cfg.doNotRebuildOwnerConsole).toBe(true);
    expect(cfg.doNotOpenCustomerCampaign).toBe(true);
    expect(cfg.notACustomerDeliverable).toBe(true);
    expect(cfg.genuineOwnerJudgmentBelongsOnExistingDesk).toBe(true);
    expect(ownerDeskRecord(cfg.recordId).company).toBe("The Studio Company");
    expect(ownerDeskRecord(cfg.recordId).kind).toBe("internal");
    expect(homepageDemo.approved).toBe(true);
    expect(homepageDemo.src).toBe(
      "/studio-demo/clip-repurposing-studio-tour-v1-polish-9.mp4?v=polish9-20261022",
    );
  });

  it("does not raise an Owner item until Quality passes", () => {
    expect(
      video1QualityMayRaiseOwnerJudgment({
        classification: "C",
        runtime: "32s",
        qaResult: "Blocked",
      }).ok,
    ).toBe(false);
    expect(
      video1QualityMayRaiseOwnerJudgment({
        classification: "A",
        runtime: "",
        qaResult: "Pass",
      }).ok,
    ).toBe(false);
    expect(video1QualityMayRaiseOwnerJudgment(passed).ok).toBe(true);
  });

  it("raises Video 1 on the existing desk with playable MP4, QA, limits, and judgment actions", () => {
    const raised = raiseVideo1OwnerJudgment(seedOwnerTrayState(), passed, "2026-10-04T03:00:00.000Z");
    const matter = raised.matters.find((entry) => entry.id === cfg.matterId);
    expect(raised.openMatterId).toBe(cfg.matterId);
    expect(matter?.matter).toBe("Video 1: Clip Repurposing");
    expect(matter?.status).toBe("WAITING ON OWNER");
    expect(matter?.tray).toBe("ACTION_REQUIRED");
    expect(matter?.playableAssetUrl).toBe(cfg.playableAssetUrl);
    expect(matter?.qaResult).toContain("Full-watch pass");
    expect(matter?.explicitLimits).toEqual([
      "ElevenLabs still unavailable. Reference VO only.",
    ]);
    expect(matter?.judgmentKind).toBe("studio_demo_owner_acceptance");
    expect(matter?.integrationAuthorized).toBe(false);
    expect(matter?.qualityClassification).toBe("A");
    expect(matter?.whyOnDesk).toBe(cfg.whyYouAreGettingThis);
    expect(matter?.decisionRequired).toBe(cfg.whatINeedFromYou);
  });

  it("does not duplicate an already-open Video 1 file", () => {
    const first = raiseVideo1OwnerJudgment(seedOwnerTrayState(), passed, "2026-10-04T03:00:00.000Z");
    const second = raiseVideo1OwnerJudgment(first, {
      ...passed,
      qaResult: "Different note",
    }, "2026-10-04T03:05:00.000Z");
    expect(second.matters.filter((entry) => entry.id === cfg.matterId)).toHaveLength(1);
    expect(second.matters.find((entry) => entry.id === cfg.matterId)?.qaResult).toContain(
      "Full-watch pass",
    );
  });

  it("Approve authorizes Scout integration only; Reject and Send Back do not", () => {
    const raised = raiseVideo1OwnerJudgment(seedOwnerTrayState(), passed, "2026-10-04T03:00:00.000Z");
    const approved = applyVideo1OwnerJudgment(raised, {
      action: "approve",
      nowIso: "2026-10-04T03:10:00.000Z",
    });
    expect(approved.decision.decision).toBe("APPROVE");
    expect(video1ScoutMayIntegrate(approved.decision)).toBe(true);
    expect(approved.decision.homepageDesignMayChange).toBe(false);
    expect(approved.state.matters.find((entry) => entry.id === cfg.matterId)?.tray).toBe(
      "SENT_IN_PROGRESS",
    );

    const rejected = applyVideo1OwnerJudgment(raised, { action: "reject" });
    expect(video1ScoutMayIntegrate(rejected.decision)).toBe(false);
    expect(rejected.state.matters.find((entry) => entry.id === cfg.matterId)?.tray).toBe(
      "COMPLETED_FILED",
    );

    const sentBack = applyVideo1OwnerJudgment(raised, {
      action: "send_back",
      note: "Need real motion in scene 3.",
    });
    expect(video1ScoutMayIntegrate(sentBack.decision)).toBe(false);
    expect(sentBack.decision.nextActor).toBe("production_team");
    expect(sentBack.state.matters.find((entry) => entry.id === cfg.matterId)?.assignedRecipient).toBe(
      "Production Team",
    );

    const fromDesk = applyOwnerTrayAction(raised, {
      action: "approve",
      matterId: cfg.matterId,
      nowIso: "2026-10-04T03:12:00.000Z",
    });
    expect(fromDesk.matters.find((entry) => entry.id === cfg.matterId)?.integrationAuthorized).toBe(
      true,
    );
  });
});
