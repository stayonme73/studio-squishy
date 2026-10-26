import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { studioReviewRoomNavigationSimplificationV1 as cfg } from "@/config/studio-review-room-navigation-simplification-v1";
import type { ClientStagesJobItem } from "@/lib/review-delivery-stage/build-client-stages";
import {
  partitionReviewRoomJobs,
  resolveReviewRoomEntry,
  resolveUnifiedRoomJobId,
  reviewProofHref,
  singleCampaignJobId,
} from "@/lib/review-room-navigation";

function job(
  overrides: Partial<ClientStagesJobItem> & Pick<ClientStagesJobItem, "jobId" | "stageId">,
): ClientStagesJobItem {
  return {
    serviceName: overrides.serviceName ?? "Make Me a Flyer",
    label: overrides.label ?? "Work Ready for Review",
    explanation: overrides.explanation ?? "Work is available for your review.",
    actionOwner: overrides.actionOwner ?? "customer",
    blocksCampaignCustomerAction: overrides.blocksCampaignCustomerAction ?? false,
    terminal: overrides.terminal ?? false,
    ...overrides,
  };
}

describe("REVIEW ROOM NAVIGATION SIMPLIFICATION", () => {
  it("keeps Maya and Review machinery guards", () => {
    expect(cfg.oneReviewRoom).toBe(true);
    expect(cfg.singleReadyDeliverableOpensProof).toBe(true);
    expect(cfg.multiServiceSelectionStaysInRoom).toBe(true);
    expect(cfg.doNotConsumeMayaRevision).toBe(true);
    expect(cfg.doNotRemintMaya).toBe(true);
    expect(cfg.doNotStartFinalApproval).toBe(true);
    expect(cfg.copy.readyHeading).toBe("Ready for your review");
    expect(cfg.copy.stillWorkingHeading).toBe("Still being worked on");
  });

  it("opens the proof when a one-job campaign is review-ready", () => {
    const flyer = job({
      jobId: "maya-flyer",
      stageId: "work-ready-for-review",
      blocksCampaignCustomerAction: true,
    });
    expect(resolveReviewRoomEntry([flyer])).toEqual({
      kind: "direct-proof",
      jobId: "maya-flyer",
    });
  });

  it("keeps a chooser when only one job is ready among several", () => {
    const flyer = job({
      jobId: "flyer",
      stageId: "work-ready-for-review",
      serviceName: "Make Me a Flyer",
      blocksCampaignCustomerAction: true,
    });
    const video = job({
      jobId: "video",
      stageId: "studio-working",
      serviceName: "Short Video",
      label: "Studio Working",
      actionOwner: "studio",
    });
    expect(resolveReviewRoomEntry([flyer, video])).toEqual({ kind: "chooser" });
    const parts = partitionReviewRoomJobs([flyer, video]);
    expect(parts.ready.map((item) => item.serviceName)).toEqual(["Make Me a Flyer"]);
    expect(parts.stillWorking.map((item) => item.serviceName)).toEqual(["Short Video"]);
  });

  it("does not open a proof when the only job is still being produced", () => {
    expect(
      resolveReviewRoomEntry([
        job({ jobId: "video", stageId: "studio-working", actionOwner: "studio" }),
      ]),
    ).toEqual({ kind: "chooser" });
  });

  it("keeps proof links on the same Review Room route", () => {
    expect(reviewProofHref("c:job-1")).toBe("/feedback-studio?jobId=c%3Ajob-1");
  });

  it("Maya Review inspect must name Maya’s job — Open Review without jobId follows current (MJ-D25)", () => {
    const mayaJob = "716a15b6-d8d6-436c-8f84-9e8b40d2f959:v2-rtu-flyer";
    expect(reviewProofHref(mayaJob)).toContain(
      "jobId=716a15b6-d8d6-436c-8f84-9e8b40d2f959",
    );
    expect(reviewProofHref(mayaJob)).not.toContain("9c6c25f2");
    const hydrate = readFileSync(
      join(process.cwd(), "src/lib/use-current-campaign.ts"),
      "utf8",
    );
    expect(hydrate).toContain('"/api/campaigns/current"');
    expect(hydrate).toContain("isFreshNonMayaCurrentCampaign");
    expect(hydrate).not.toContain("bindLocalNonMaya");
  });

  it("Delivery room without jobId still names the owned one-job campaign", () => {
    const mayaJob = "716a15b6-d8d6-436c-8f84-9e8b40d2f959:v2-rtu-flyer";
    expect(
      resolveUnifiedRoomJobId(
        {
          campaignId: "716a15b6-d8d6-436c-8f84-9e8b40d2f959",
          approvedStudioPlan: {
            selectedServiceIds: ["v2-rtu-flyer"],
          } as never,
        },
        null,
      ),
    ).toBe(mayaJob);
    expect(
      resolveUnifiedRoomJobId(
        {
          campaignId: "716a15b6-d8d6-436c-8f84-9e8b40d2f959",
          approvedStudioPlan: {
            selectedServiceIds: ["v2-rtu-flyer"],
          } as never,
        },
        mayaJob,
      ),
    ).toBe(mayaJob);
    const scene = readFileSync(
      join(process.cwd(), "src/components/feedback-studio/FeedbackStudioScene.tsx"),
      "utf8",
    );
    expect(scene).toContain("resolveUnifiedRoomJobId(campaign, jobIdParam)");
  });

  it("opens a one-job campaign Review URL without waiting on stages", () => {
    expect(
      singleCampaignJobId(["716a15b6-d8d6-436c-8f84-9e8b40d2f959:v2-rtu-flyer"]),
    ).toBe("716a15b6-d8d6-436c-8f84-9e8b40d2f959:v2-rtu-flyer");
    expect(singleCampaignJobId([])).toBeNull();
    expect(singleCampaignJobId(["a", "b"])).toBeNull();
  });

  it("does not keep an Open Review second doorway in the shell", () => {
    const shell = readFileSync(
      join(process.cwd(), "src/components/review-delivery/ReviewDeliveryRoomShell.tsx"),
      "utf8",
    );
    const scene = readFileSync(
      join(process.cwd(), "src/components/feedback-studio/FeedbackStudioScene.tsx"),
      "utf8",
    );
    expect(shell).not.toContain("Open Review");
    expect(shell).toContain("navCopy.copy.readyHeading");
    expect(shell).toContain("navCopy.copy.stillWorkingHeading");
    expect(scene).toContain("resolveReviewRoomEntry");
    expect(scene).toContain("direct-proof");
  });
});
