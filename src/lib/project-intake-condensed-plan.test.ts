import { describe, expect, it } from "vitest";

import { isCondensedHeadlineId } from "@/config/studio-customer-journey-condense-v1";
import {
  buildCondensedOfferIntakePlan,
  clipIntakeOptionalKeys,
  clipIntakeVisibleGaps,
  clipProductionFactsSaved,
  projectIntakeServiceFieldKey,
  socialGraphicsFilesAreNext,
  socialIntakeVisibleGaps,
  withSavedIntakeContact,
} from "@/lib/project-intake-plan";
import { isProjectIntakePlanReady } from "@/lib/project-intake-completeness";
import { buildProjectIntakeTabletStatus } from "@/lib/project-intake-tablet-status";

const copy = {
  paymentReceivedLabel: "Payment received",
  servicesConfirmedLabel: "Services confirmed",
  stillNeededNoneLabel: "None — all required items are complete.",
  nextRequiredRemaining: "Complete the remaining required items.",
  nextReady: "Review and continue.",
  nextReadyMaterialsLater: "Materials later.",
};

function labels(packageId: string, name: string) {
  const plan = buildCondensedOfferIntakePlan({ packageId, name });
  return [
    ...plan.sharedFields.map((field) => field.field.label),
    ...plan.services.flatMap((section) => section.fields.map((field) => field.label)),
  ];
}

function hint(packageId: string) {
  const plan = buildCondensedOfferIntakePlan({
    packageId,
    name: packageId,
  });
  return plan.sharedFields.find((field) => field.field.role === "materials")
    ?.field.hint;
}

describe("condensed Project Intake truth", () => {
  it("keeps Clip questions and materials wording free of logo and social copy", () => {
    const text = `${labels("clip_repurposing", "Clip Repurposing").join(" ")} ${hint("clip_repurposing")}`;
    expect(text).toMatch(/15–60 minute/);
    expect(text).toMatch(/one primary speaker/);
    expect(text).toMatch(/What do you want these shorts to help people understand or do/);
    expect(text).not.toMatch(/Exact CTA/);
    expect(text).not.toMatch(/native-vertical/);
    expect(text).not.toMatch(/logo/i);
    expect(text).not.toMatch(/wordmark/i);
    expect(text).not.toMatch(/45 seconds/);
  });

  it("asks Short-Form for selected moments, not a long source or a logo", () => {
    const text = `${labels("short_form_video_editing", "Short-Form Video Editing").join(" ")} ${hint("short_form_video_editing")}`;
    expect(text).toMatch(/selected English clips or marked moments/i);
    expect(text).toMatch(/up to 3 selected English clips/);
    expect(text).toMatch(/45 seconds/);
    expect(text).not.toMatch(/15–60/);
    expect(text).not.toMatch(/logo/i);
    expect(text).not.toMatch(/primary speaker/);
  });

  it("keeps Social on graphics copy and allows a business-name wordmark", () => {
    const text = `${labels("social_and_promo_graphics", "Social & Promo Graphics").join(" ")} ${hint("social_and_promo_graphics")}`;
    expect(text).toMatch(/logo/i);
    expect(text).not.toMatch(/business name can be used|wordmark/i);
    expect(text).toMatch(/offer, promotion, or campaign theme/);
    expect(text).not.toMatch(/15–60|45 seconds|primary speaker|keep or cut/);
  });

  it("asks Clip again only for a required answer that is still empty", () => {
    const saved = {
      "clip_repurposing:purpose": "Show the weekly special.",
      "clip_repurposing:qualifyingSource": "I am sending one source.",
      "clip_repurposing:intelligible": "The speech and audio are clear enough to follow.",
      "clip_repurposing:rights": "I own this recording, or I have permission from everyone who appears in it.",
      "clip_repurposing:context": "Optional note.",
      "clip_repurposing:cta": "",
    };
    expect(clipProductionFactsSaved(saved)).toBe(true);
    expect(
      clipIntakeVisibleGaps(saved, {
        businessName: "River Cafe",
        email: "maya@example.com",
      }),
    ).toEqual([]);
    expect(clipIntakeVisibleGaps({ ...saved, "clip_repurposing:purpose": " " })).toEqual([
      "shared:businessName",
      "shared:email",
      "clip_repurposing:purpose",
    ]);
    expect(clipProductionFactsSaved({ ...saved, "clip_repurposing:intelligible": "" })).toBe(
      false,
    );
    expect(
      clipIntakeVisibleGaps(
        { "clip_repurposing:purpose": "Show the weekly special." },
        { businessName: "River Cafe", email: "maya@example.com" },
      ),
    ).toEqual([
      "clip_repurposing:qualifyingSource",
      "clip_repurposing:intelligible",
      "clip_repurposing:rights",
    ]);
    expect(
      clipIntakeOptionalKeys({
        "clip_repurposing:purpose": "Show the weekly special.",
      }),
    ).toEqual([
      "clip_repurposing:context",
      "clip_repurposing:cta",
      "clip_repurposing:mustKeep",
      "clip_repurposing:mustNot",
    ]);
    expect(clipIntakeOptionalKeys(saved)).toEqual([]);
  });

  it("asks Social for permission at intake and keeps the saved theme", () => {
    expect(
      socialIntakeVisibleGaps(
        {},
        {
          businessName: "Proof Co",
          email: "customer-one@local.dev",
          purpose: "Announce the spring open house",
        },
      ),
    ).toEqual(["social_and_promo_graphics:rights"]);
    expect(
      socialIntakeVisibleGaps(
        {},
        { businessName: "Proof Co", email: "customer-one@local.dev", purpose: "" },
      ),
    ).toEqual(["social_and_promo_graphics:purpose", "social_and_promo_graphics:rights"]);
    expect(
      socialGraphicsFilesAreNext({
        paymentReceivedAt: "2026-10-23T00:00:00.000Z",
        condensedOffer: {
          packageId: "social_and_promo_graphics",
          company: "Proof Co",
          customerEmail: "customer-one@local.dev",
          projectNeed: "Announce the spring open house",
        },
        routeMapIntakeDraft: {
          answers: {
            "shared:email": "studio@proof.example",
            "social_and_promo_graphics:rights":
              "I have permission to use the materials I am supplying.",
          },
        },
      }),
    ).toBe(true);
    expect(
      socialGraphicsFilesAreNext({
        paymentReceivedAt: "2026-10-23T00:00:00.000Z",
        condensedOffer: {
          packageId: "social_and_promo_graphics",
          company: "Proof Co",
          customerEmail: "customer-one@local.dev",
          projectNeed: "Announce the spring open house",
        },
        routeMapIntakeDraft: { answers: {} },
      }),
    ).toBe(false);
    expect(
      socialGraphicsFilesAreNext({
        paymentReceivedAt: "2026-10-23T00:00:00.000Z",
        condensedOffer: {
          packageId: "social_and_promo_graphics",
          company: "Proof Co",
          customerEmail: "customer-one@local.dev",
          projectNeed: "",
        },
      }),
    ).toBe(false);
  });

  it("does not call required identity complete while business name and email are empty", () => {
    const plan = buildCondensedOfferIntakePlan({
      packageId: "clip_repurposing",
      name: "Clip Repurposing",
    });
    const status = buildProjectIntakeTabletStatus({
      plan,
      answers: {},
      paymentReceived: true,
      servicesConfirmed: true,
      copy,
    });
    expect(status.ready).toBe(false);
    expect(status.stillNeeded).toContain("Business name");
    expect(status.stillNeeded).toContain("Business email");
    expect(status.stillNeeded).not.toContain(copy.stillNeededNoneLabel);
  });

  it("lets optional notes stay empty without blocking Continue", () => {
    const plan = buildCondensedOfferIntakePlan({
      packageId: "short_form_video_editing",
      name: "Short-Form Video Editing",
    });
    const moments = plan.services[0]?.fields.find((field) => field.id === "selectedMoments");
    expect(moments?.required).toBe(false);
    const status = buildProjectIntakeTabletStatus({
      plan,
      answers: {
        "shared:businessName": "River Cafe",
        "shared:email": "maya@example.com",
        "short_form_video_editing:purpose": "Explain the offer.",
        "short_form_video_editing:markedMoments":
          "I am sending up to 3 English clips or marked moments. Each one is 45 seconds or less, and I have marked the moments to use.",
        "short_form_video_editing:usableFootage": "The footage and audio are clear enough to use.",
        "short_form_video_editing:rights":
          "I own these clips, or I have permission from everyone who appears in them.",
      },
      paymentReceived: true,
      servicesConfirmed: true,
      copy,
    });
    expect(status.ready).toBe(true);
    expect(status.stillNeeded).toEqual([copy.stillNeededNoneLabel]);
  });

  it("uses the three headline package titles and leaves the other packages out", () => {
    const headlines = [
      ["clip_repurposing", "Clip Repurposing"],
      ["short_form_video_editing", "Short-Form Video Editing"],
      ["social_and_promo_graphics", "Social & Promo Graphics"],
    ];
    for (const [packageId, name] of headlines) {
      const plan = buildCondensedOfferIntakePlan({ packageId, name });
      expect(plan.services).toHaveLength(1);
      expect(isCondensedHeadlineId(plan.services[0]?.serviceId)).toBe(true);
      expect(plan.services[0]?.title).toBe(name);
    }
    for (const packageId of ["creative_qa_finish", "campaign_launch_kit"]) {
      const plan = buildCondensedOfferIntakePlan({ packageId, name: packageId });
      expect(isCondensedHeadlineId(plan.services[0]?.serviceId)).toBe(false);
    }
  });

  it("keeps Continue shut until saved name, email, and purpose are in the answer bag", () => {
    const plan = buildCondensedOfferIntakePlan({
      packageId: "clip_repurposing",
      name: "Clip Repurposing",
    });
    const checks = Object.fromEntries(
      (plan.services[0]?.fields ?? [])
        .filter((field) => field.type === "checkbox")
        .map((field) => [
          projectIntakeServiceFieldKey("clip_repurposing", field.id),
          field.label,
        ]),
    );
    expect(isProjectIntakePlanReady(plan, checks)).toBe(false);
    const seeded = withSavedIntakeContact(checks, "clip_repurposing", {
      businessName: "Example Co",
      email: "inspection@example.com",
      purpose: "Show the offer.",
    });
    expect(isProjectIntakePlanReady(plan, seeded)).toBe(true);
  });
});
