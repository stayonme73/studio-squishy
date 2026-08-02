import { describe, expect, it } from "vitest";

import { RAW_SERVICE_CATALOG } from "@/catalog/services";
import { helpCenter } from "@/config/help-center";
import { paymentTimelineLabel } from "@/config/payment";
import { studioPolicies } from "@/config/policies";
import { studioBoard } from "@/config/studio-board";
import { getStudioGuideV1Package } from "@/config/studio-guide-v1-lock";

describe("GATE-2 service promise truth", () => {
  it("does not promise payment alone starts production on Studio Board", () => {
    const paid = studioBoard.statusContent.PAYMENT_RECEIVED;
    expect(paid.headerSubline.toLowerCase()).not.toContain("entering production");
    expect(paid.campaignDescription.toLowerCase()).not.toContain(
      "will begin creative work on your campaign",
    );
    expect(paid.nextUpdateLabel.toLowerCase()).not.toContain("business days");
    expect(paid.estimatedCompletion.toLowerCase()).not.toContain("7 business days");
    expect(paid.estimatedFirstConcepts).not.toMatch(/june/i);
    expect(paid.headerSubline.toLowerCase()).toContain("production gate");
    expect(paid.studioNoteFollowUp.toLowerCase()).toContain("has not begun");
  });

  it("does not show demo countdown ETAs while building concepts", () => {
    const building = studioBoard.statusContent.BUILDING_CONCEPTS;
    expect(building.nextUpdateLabel).not.toMatch(/^\d+\s*days?$/i);
    expect(building.estimatedCompletion.toLowerCase()).not.toContain("days remaining");
    expect(building.studioUpdates.every((u) => !/june/i.test(u.date))).toBe(true);
  });

  it("does not claim need-based recommendation engine or on-proof annotate in Help", () => {
    const policyText = JSON.stringify(studioPolicies);
    expect(policyText).not.toContain(
      "The Studio recommends individual services based on what you need.",
    );
    expect(policyText).not.toContain("annotate, approve, or request revisions directly");
    expect(policyText).toContain("suggests a starting route");
    expect(policyText).toContain("open proofs via link");

    const reviewGuide = helpCenter.quickPolicyGuide.rows.find(
      (item) => item.id === "review-room",
    );
    expect(reviewGuide?.summary).toBeTruthy();
    expect(reviewGuide!.summary).not.toContain(
      "Annotate, approve, or request revisions directly",
    );
    expect(reviewGuide!.summary.toLowerCase()).toContain("open proofs via link");
  });

  it("does not promise absolute full refund or fixed 7-day delivery on guide packages", () => {
    for (const id of ["spark", "momentum", "growth"] as const) {
      const pkg = getStudioGuideV1Package(id);
      expect(pkg).toBeTruthy();
      expect(pkg!.refundPolicy.join(" ")).not.toMatch(/full refund available/i);
      expect(pkg!.refundPolicy.join(" ").toLowerCase()).toContain("may be approved");
      expect(pkg!.timeline.toLowerCase()).not.toContain("within 7 business days");
      expect(pkg!.timeline.toLowerCase()).toContain("production starts");
    }
    expect(paymentTimelineLabel("spark")).toBe("After production starts");
  });

  it("does not claim managed execution as a standing client responsibility without a publishing add-on", () => {
    const monthly = RAW_SERVICE_CATALOG.find((s) => s.id === "sm-001-monthly");
    expect(monthly).toBeTruthy();
    expect(
      monthly!.clientResponsibilities.join(" ").toLowerCase(),
    ).not.toContain("managed execution");
    expect(
      monthly!.clientResponsibilities.join(" ").toLowerCase(),
    ).toContain("publishing add-on");
  });
});
