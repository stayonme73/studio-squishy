import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  FLYER_PRODUCTION_INTAKE_ANSWER_KEYS,
  applyFlyerProductionIntakeCorrectionToRecord,
  flyerMustIncludeHasProductionFacts,
  isFlyerProductionIntakeReady,
  mergeFlyerProductionIntakeAnswers,
  missingFlyerConversionRoute,
  missingFlyerProductionIntakeFieldIds,
  needsFlyerProductionIntakeCorrection,
  needsFlyerProductionObserverRetry,
  textCarriesConversionRoute,
  textRequestsQrWithoutDestination,
} from "@/lib/project-intake-flyer-production";

const now = "2026-09-09T00:19:37.586Z";

const HONEST_MUST_INCLUDE =
  "Grand Opening — 20% off first styling appointment. $45. Call (804) 555-0142 or visit mayasmobileboutique.example.";

function maya(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "716a15b6-d8d6-436c-8f84-9e8b40d2f959",
    campaignName: "Maya’s Mobile Boutique",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "The Studio is creating your options with care and creativity.",
    estimatedCompletion: "In progress",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: "2026-09-06T22:28:33.080Z",
    createdAt: now,
    updatedAt: now,
    deliverablesDelivered: {},
    approvedStudioPlan: {
      selectedServiceIds: ["v2-rtu-flyer"],
      includedServiceIds: ["v2-rtu-flyer"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 6900,
      monthlyTotalCents: 0,
      amountDueTodayCents: 6900,
      lineItems: [],
      approvedAt: now,
    },
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: { "shared:materials": "I do not have this yet" },
    },
    ...overrides,
  };
}

describe("project-intake-flyer-production", () => {
  it("uses prefixed live-form keys for the three flyer production fields", () => {
    expect(FLYER_PRODUCTION_INTAKE_ANSWER_KEYS).toEqual([
      "v2-rtu-flyer:flyerPurpose",
      "v2-rtu-flyer:mustInclude",
      "v2-rtu-flyer:intendedUse",
    ]);
  });

  it("requires an offer price, phone, and website — and does not treat the Studio fee as enough", () => {
    expect(flyerMustIncludeHasProductionFacts("Make Me a Flyer for $69")).toBe(
      false,
    );
    expect(
      flyerMustIncludeHasProductionFacts(
        "Grand opening. Call (804) 555-0142 or visit mayasmobileboutique.example.",
      ),
    ).toBe(false);
    expect(flyerMustIncludeHasProductionFacts(HONEST_MUST_INCLUDE)).toBe(true);
  });

  it("treats Maya materials-only submitted Intake as needing flyer correction", () => {
    const campaign = maya();
    expect(needsFlyerProductionIntakeCorrection(campaign)).toBe(true);
    expect(isFlyerProductionIntakeReady(campaign)).toBe(false);
    expect(missingFlyerProductionIntakeFieldIds(campaign.routeMapIntake?.answers)).toEqual(
      ["flyerPurpose", "mustInclude", "intendedUse"],
    );
  });

  it("merges only the three flyer keys onto existing submitted answers", () => {
    const merged = mergeFlyerProductionIntakeAnswers(
      { "shared:materials": "I do not have this yet" },
      {
        "v2-rtu-flyer:flyerPurpose": "Grand opening flyer for Maya’s Mobile Boutique",
        "v2-rtu-flyer:mustInclude": HONEST_MUST_INCLUDE,
        "v2-rtu-flyer:intendedUse": "Both print and digital",
        "shared:materials": "overwrite me",
      },
    );
    expect(merged["shared:materials"]).toBe("I do not have this yet");
    expect(merged["v2-rtu-flyer:flyerPurpose"]).toBe(
      "Grand opening flyer for Maya’s Mobile Boutique",
    );
    expect(merged["v2-rtu-flyer:mustInclude"]).toBe(HONEST_MUST_INCLUDE);
    expect(merged["v2-rtu-flyer:intendedUse"]).toBe("Both print and digital");
  });

  /**
   * Owner calibration 2026-09-14: a flyer that asks the reader to act and offers
   * no way to act is not production-ready. The Studio still invents nothing — it
   * asks once, and "informational, no contact" is an accepted answer.
   */
  it("asks once for an action route before producing a launch announcement, and still invents no phone or price", () => {
    const campaign = maya({
      routeMapIntake: {
        submittedAt: now,
        answers: {
          "shared:materials": "No logo yet. Use the business name The Studio as a clean wordmark.",
          "v2-rtu-flyer:flyerPurpose":
            "Launch announcement for The Studio. Invite small-business owners to use The Studio.",
          "v2-rtu-flyer:mustInclude":
            "THE STUDIO\nOpening October 2026\nNow accepting launch clients.",
          "v2-rtu-flyer:intendedUse": "Both print and digital",
        },
      },
    });
    expect(missingFlyerProductionIntakeFieldIds(campaign.routeMapIntake?.answers)).toEqual(
      [],
    );
    expect(isFlyerProductionIntakeReady(campaign)).toBe(true);
    expect(missingFlyerConversionRoute(campaign)).toBe(true);
    expect(needsFlyerProductionIntakeCorrection(campaign)).toBe(true);
    expect(
      flyerMustIncludeHasProductionFacts(
        String(campaign.routeMapIntake?.answers["v2-rtu-flyer:mustInclude"]),
      ),
    ).toBe(false);
    // Asking is not inventing: nothing has been added to the customer's copy.
    expect(campaign.routeMapIntake?.answers["v2-rtu-flyer:mustInclude"]).toBe(
      "THE STUDIO\nOpening October 2026\nNow accepting launch clients.",
    );
  });

  it("accepts the customer's own word that a piece is informational with no contact", () => {
    const campaign = maya({
      routeMapIntake: {
        submittedAt: now,
        answers: {
          "shared:materials": "No logo yet.",
          "v2-rtu-flyer:flyerPurpose":
            "Closure notice for the studio. Informational only, no contact details.",
          "v2-rtu-flyer:mustInclude": "THE STUDIO\nClosed for renovation until October.",
          "v2-rtu-flyer:intendedUse": "Window notice",
        },
      },
    });
    expect(missingFlyerConversionRoute(campaign)).toBe(false);
    expect(needsFlyerProductionIntakeCorrection(campaign)).toBe(false);
  });

  it("treats a phone, a website, an email, or an address as an action route", () => {
    expect(textCarriesConversionRoute("Call (804) 555-0142 today")).toBe(true);
    expect(textCarriesConversionRoute("Book at mayasmobileboutique.example")).toBe(true);
    expect(textCarriesConversionRoute("Email hello@thestudio.example")).toBe(true);
    expect(textCarriesConversionRoute("Visit 118 Market Street")).toBe(true);
    expect(
      textCarriesConversionRoute(
        "Creative services for small businesses and entrepreneurs. Now accepting launch clients.",
      ),
    ).toBe(false);
  });

  it("does not accept a QR code with nothing behind it as an action route", () => {
    // A QR code needs a destination. Asking for the square is not supplying one.
    expect(textCarriesConversionRoute("Please add a QR code in the corner")).toBe(false);
    expect(textRequestsQrWithoutDestination("Please add a QR code in the corner")).toBe(
      true,
    );
    // With somewhere for it to point, the route is real.
    expect(
      textCarriesConversionRoute("QR code to mayasmobileboutique.example/book"),
    ).toBe(true);
    expect(
      textRequestsQrWithoutDestination("QR code to mayasmobileboutique.example/book"),
    ).toBe(false);
  });

  it("asks for a route when the customer requested a QR code but gave no destination", () => {
    const campaign = maya({
      routeMapIntake: {
        submittedAt: now,
        answers: {
          "shared:materials": "No logo yet.",
          "v2-rtu-flyer:flyerPurpose": "Drive bookings for the grand opening",
          "v2-rtu-flyer:mustInclude":
            "THE STUDIO\nGrand Opening October 2026\nPut a QR code on it so people can book.",
          "v2-rtu-flyer:intendedUse": "Both print and digital",
        },
      },
    });
    expect(missingFlyerConversionRoute(campaign)).toBe(true);
    expect(needsFlyerProductionIntakeCorrection(campaign)).toBe(true);
  });

  it("accepts the ways customers actually say a piece needs no contact route", () => {
    for (const purpose of [
      "Informational piece for the front window.",
      "Internal notice for staff only.",
      "Hours change only — no call to action.",
      "Do not include contact details on this one.",
      "For information only.",
    ]) {
      const campaign = maya({
        routeMapIntake: {
          submittedAt: now,
          answers: {
            "shared:materials": "No logo yet.",
            "v2-rtu-flyer:flyerPurpose": purpose,
            "v2-rtu-flyer:mustInclude": "THE STUDIO\nClosed for renovation until October.",
            "v2-rtu-flyer:intendedUse": "Window notice",
          },
        },
      });
      expect(missingFlyerConversionRoute(campaign)).toBe(false);
    }
  });

  it("clears the correction once prefixed flyer fields are production-ready", () => {
    const campaign = maya({
      routeMapIntake: {
        submittedAt: now,
        answers: {
          "shared:materials": "I do not have this yet",
          "v2-rtu-flyer:flyerPurpose": "Grand opening flyer for Maya’s Mobile Boutique",
          "v2-rtu-flyer:mustInclude": HONEST_MUST_INCLUDE,
          "v2-rtu-flyer:intendedUse": "Both print and digital",
        },
      },
    });
    expect(needsFlyerProductionIntakeCorrection(campaign)).toBe(false);
    expect(isFlyerProductionIntakeReady(campaign)).toBe(true);
  });

  it("keeps the correction open when production rejected the flyer spec", () => {
    const campaign = maya({
      routeMapIntake: {
        submittedAt: now,
        answers: {
          "shared:materials": "I do not have this yet",
          "v2-rtu-flyer:flyerPurpose": "Grand opening flyer for Maya’s Mobile Boutique",
          "v2-rtu-flyer:mustInclude": HONEST_MUST_INCLUDE,
          "v2-rtu-flyer:intendedUse": "Both print and digital",
        },
      },
      dispatchExecution: {
        schemaVersion: 1,
        status: "evaluated",
        evaluatedAt: now,
        lastAttemptAt: now,
        activationCheckoutSessionId: "cs",
        records: [],
        ownerActionRequired: false,
        designRendererObserver: {
          packageId: "STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1",
          observedAt: now,
          campaignId: "716a15b6-d8d6-436c-8f84-9e8b40d2f959",
          results: [
            {
              dispatchId: "dd:x",
              skuId: "v2-rtu-flyer",
              action: "invoked",
              ok: false,
              failureCode: "INVALID_DESIGN_SPEC",
              message: "Spec text contains prohibited claim: % off",
              ownerRoutineProduction: "NONE",
              canvaRequired: false,
              makeRequired: false,
            },
          ],
          ownerRoutineProduction: "NONE",
          canvaRequired: false,
          makeRequired: false,
        },
      },
    });
    expect(isFlyerProductionIntakeReady(campaign)).toBe(true);
    expect(needsFlyerProductionIntakeCorrection(campaign)).toBe(true);
  });

  it("retries observer after INVALID_DESIGN_SPEC once flyer fields exist", () => {
    const failed = maya({
      dispatchExecution: {
        schemaVersion: 1,
        status: "evaluated",
        evaluatedAt: now,
        lastAttemptAt: now,
        activationCheckoutSessionId: "cs_sandbox_716a15b6",
        records: [],
        ownerActionRequired: false,
        lastError: null,
        designRendererObserver: {
          packageId: "STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1",
          observedAt: now,
          campaignId: "716a15b6-d8d6-436c-8f84-9e8b40d2f959",
          results: [
            {
              dispatchId: "dd:716a15b6-d8d6-436c-8f84-9e8b40d2f959:v2-rtu-flyer",
              skuId: "v2-rtu-flyer",
              action: "invoked",
              ok: false,
              failureCode: "INVALID_DESIGN_SPEC",
              message: "Authoritative Route Map flyer intake missing flyerPurpose or mustInclude",
              ownerRoutineProduction: "NONE",
              canvaRequired: false,
              makeRequired: false,
            },
          ],
          ownerRoutineProduction: "NONE",
          canvaRequired: false,
          makeRequired: false,
        },
      },
    });
    expect(needsFlyerProductionObserverRetry(failed)).toBe(false);

    const ready = {
      ...failed,
      routeMapIntake: {
        submittedAt: now,
        answers: {
          "shared:materials": "I do not have this yet",
          "v2-rtu-flyer:flyerPurpose": "Grand opening flyer for Maya’s Mobile Boutique",
          "v2-rtu-flyer:mustInclude": HONEST_MUST_INCLUDE,
          "v2-rtu-flyer:intendedUse": "Both print and digital",
        },
      },
    };
    expect(needsFlyerProductionObserverRetry(ready)).toBe(true);
  });

  it("does not retry a successful flyer render or an unrelated material failure", () => {
    const rendered = maya({
      routeMapIntake: {
        submittedAt: now,
        answers: {
          "v2-rtu-flyer:flyerPurpose": "Grand opening flyer for Maya’s Mobile Boutique",
          "v2-rtu-flyer:mustInclude": HONEST_MUST_INCLUDE,
          "v2-rtu-flyer:intendedUse": "Both print and digital",
        },
      },
      dispatchExecution: {
        schemaVersion: 1,
        status: "evaluated",
        evaluatedAt: now,
        lastAttemptAt: now,
        activationCheckoutSessionId: "cs",
        records: [],
        ownerActionRequired: false,
        designRendererObserver: {
          packageId: "STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1",
          observedAt: now,
          campaignId: "716a15b6-d8d6-436c-8f84-9e8b40d2f959",
          results: [
            {
              dispatchId: "dd:x",
              skuId: "v2-rtu-flyer",
              action: "invoked",
              ok: true,
              invocationOutcome: "RENDERED",
              ownerRoutineProduction: "NONE",
              canvaRequired: false,
              makeRequired: false,
            },
          ],
          ownerRoutineProduction: "NONE",
          canvaRequired: false,
          makeRequired: false,
        },
      },
    });
    expect(needsFlyerProductionObserverRetry(rendered)).toBe(false);

    const materialsFail = {
      ...rendered,
      dispatchExecution: {
        ...rendered.dispatchExecution!,
        designRendererObserver: {
          ...rendered.dispatchExecution!.designRendererObserver!,
          results: [
            {
              dispatchId: "dd:x",
              skuId: "v2-rtu-flyer",
              action: "invoked",
              ok: false,
              failureCode: "MISSING_REQUIRED_MATERIAL",
              ownerRoutineProduction: "NONE" as const,
              canvaRequired: false,
              makeRequired: false,
            },
          ],
        },
      },
    };
    expect(needsFlyerProductionObserverRetry(materialsFail)).toBe(false);
  });

  it("applies flyer correction onto submitted answers without rewriting submittedAt or materials", () => {
    const campaign = maya();
    const updated = applyFlyerProductionIntakeCorrectionToRecord(campaign, {
      "v2-rtu-flyer:flyerPurpose": "Grand opening flyer for Maya’s Mobile Boutique",
      "v2-rtu-flyer:mustInclude": HONEST_MUST_INCLUDE,
      "v2-rtu-flyer:intendedUse": "Both print and digital",
      "shared:materials": "overwrite me",
    });
    expect(updated?.routeMapIntakeSubmittedAt).toBe(now);
    expect(updated?.routeMapIntake?.answers["shared:materials"]).toBe(
      "I do not have this yet",
    );
    expect(updated?.routeMapIntake?.answers["v2-rtu-flyer:mustInclude"]).toContain("$45");
    expect(updated?.routeMapIntake?.answers["v2-rtu-flyer:mustInclude"]).not.toContain("$69");
  });
});
