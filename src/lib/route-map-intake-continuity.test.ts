import { describe, expect, it } from "vitest";

import { getRouteMapIntakeSchema } from "@/config/route-map-intake-v1";
import type { CampaignRecord } from "@/config/studio-board";
import {
  INTAKE_CONTINUITY_COPY,
  hasProtectedLocalIntakeDraft,
  mergeCampaignPreferLocalIntakeDraft,
  resolveIntakeEntrySurface,
  schemaAnswersFromDraft,
  socialPostsStateFromAnswers,
} from "@/lib/route-map-intake-continuity";

const now = "2026-07-13T20:00:00.000Z";

function paidSocialCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "pkg2-continuity",
    campaignName: "Make My Social Media Posts",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Paid",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: "Payment received." }],
    routeMapContext: {
      roadId: "i20",
      jobId: "v2-rtu-social-posts",
      selectedServiceIds: ["v2-rtu-social-posts"],
      currentStep: "intake",
      selectedAt: now,
    },
    approvedStudioPlan: {
      selectedServiceIds: ["v2-rtu-social-posts"],
      includedServiceIds: ["v2-rtu-social-posts"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 9900,
      monthlyTotalCents: 0,
      amountDueTodayCents: 9900,
      lineItems: [],
      approvedAt: now,
    },
    ...overrides,
  };
}

describe("route-map-intake-continuity", () => {
  it("restores Social Posts choices and notes from flattened draft answers", () => {
    const restored = socialPostsStateFromAnswers({
      socialPostsPurposeChoice: "Promote an offer",
      postsAbout: "Promote an offer — Weekend sale",
      socialPostsActionChoice: "Visit website",
      callToAction: "Visit website — Destination: https://example.com",
      socialPostsPlatformChoice: "Instagram Post",
      socialPostsMaterialsChoices: "I can provide a logo, I do not have these yet",
      materials:
        "Selected materials path: I can provide a logo, I do not have these yet\nSelected file: logo.png\nFile type: image/png\nNotes: Use teal accents",
      wordingHashtags: "Offer ends Sunday",
    });

    expect(restored.purpose).toBe("Promote an offer");
    expect(restored.purposeDetail).toBe("Weekend sale");
    expect(restored.action).toBe("Visit website");
    expect(restored.actionDestination).toBe("https://example.com");
    expect(restored.platform).toBe("Instagram Post");
    expect(restored.materialActions).toEqual([
      "I can provide a logo",
      "I do not have these yet",
    ]);
    expect(restored.fileName).toBe("logo.png");
    expect(restored.fileMimeType).toBe("image/png");
    expect(restored.materialNote).toBe("Use teal accents");
    expect(restored.requiredWording).toBe("Offer ends Sunday");
  });

  it("restores only schema fields present on the live form", () => {
    const schema = getRouteMapIntakeSchema("rtu-flyer");
    const restored = schemaAnswersFromDraft(schema, {
      flyerPurpose: "Grand opening",
      unknownFutureField: "ignore me",
      mustInclude: "June 15",
    });

    expect(restored.flyerPurpose).toBe("Grand opening");
    expect(restored.mustInclude).toBe("June 15");
    expect(restored.unknownFutureField).toBeUndefined();
  });

  it("opens the editable form when paid incomplete Intake has Route Map context", () => {
    const campaign = paidSocialCampaign({
      routeMapIntakeDraft: {
        answers: { socialPostsPurposeChoice: "Promote an offer" },
        savedAt: now,
      },
    });
    const surface = resolveIntakeEntrySurface(campaign, "intake");
    expect(surface?.kind).toBe("form");
    if (surface?.kind === "form") {
      expect(surface.jobId).toBe("v2-rtu-social-posts");
      expect(surface.draftAnswers?.socialPostsPurposeChoice).toBe("Promote an offer");
    }
  });

  it("explains already-submitted Intake instead of opening the form", () => {
    const campaign = paidSocialCampaign({
      routeMapIntakeSubmittedAt: now,
      routeMapIntake: { answers: { postsAbout: "done" }, submittedAt: now },
    });
    const surface = resolveIntakeEntrySurface(campaign, "intake");
    expect(surface).toEqual({ kind: "already-submitted" });
    expect(INTAKE_CONTINUITY_COPY.alreadySubmittedTitle).toContain("already been submitted");
  });

  it("routes unpaid customers to Checkout recovery", () => {
    const campaign = paidSocialCampaign({ paymentReceivedAt: undefined });
    const surface = resolveIntakeEntrySurface(campaign, "intake");
    expect(surface).toEqual({ kind: "missing-payment" });
  });

  it("routes missing-plan customers to Studio Plan when a road is known", () => {
    const campaign = paidSocialCampaign({ approvedStudioPlan: undefined });
    const surface = resolveIntakeEntrySurface(campaign, "intake");
    expect(surface?.kind).toBe("missing-plan");
    if (surface?.kind === "missing-plan") {
      expect(surface.recoveryHref).toContain("project-builder");
      expect(surface.recoveryLabel).toBe("Return to Studio Plan");
    }
  });

  it("routes missing context to Studio Board when payment exists without a restoreable job", () => {
    const campaign = paidSocialCampaign({
      routeMapContext: undefined,
    });
    const surface = resolveIntakeEntrySurface(campaign, "intake");
    expect(surface?.kind).toBe("missing-context");
    if (surface?.kind === "missing-context") {
      expect(surface.recoveryLabel).toBe("Return to Studio Board");
      expect(surface.recoveryHref).toBe("/studio-board");
    }
  });

  it("protects paid incomplete local drafts with usable answers", () => {
    expect(
      hasProtectedLocalIntakeDraft(
        paidSocialCampaign({
          routeMapIntakeDraft: {
            answers: { socialPostsPurposeChoice: "Promote an offer" },
            savedAt: now,
          },
        }),
      ),
    ).toBe(true);
    expect(hasProtectedLocalIntakeDraft(paidSocialCampaign())).toBe(false);
    expect(
      hasProtectedLocalIntakeDraft(
        paidSocialCampaign({
          routeMapIntakeSubmittedAt: now,
          routeMapIntakeDraft: {
            answers: { socialPostsPurposeChoice: "Promote an offer" },
            savedAt: now,
          },
        }),
      ),
    ).toBe(false);
  });

  it("keeps the newer local Intake draft when hydrating the same campaign id", () => {
    const server = paidSocialCampaign({
      routeMapIntakeDraft: {
        answers: { socialPostsPurposeChoice: "Build awareness" },
        savedAt: "2026-07-13T19:00:00.000Z",
      },
    });
    const local = paidSocialCampaign({
      routeMapIntakeDraft: {
        answers: { socialPostsPurposeChoice: "Promote an offer" },
        savedAt: "2026-07-13T21:00:00.000Z",
      },
    });
    const merged = mergeCampaignPreferLocalIntakeDraft(server, local);
    expect(merged.routeMapIntakeDraft?.answers.socialPostsPurposeChoice).toBe(
      "Promote an offer",
    );
  });
});
