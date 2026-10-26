import { describe, expect, it } from "vitest";

import { studioMobileCustomerJourneyCertificationV1 as mobile } from "@/config/studio-mobile-customer-journey-certification-v1";
import { studioWorkSupervisionV1 as supervision } from "@/config/studio-work-supervision-and-incident-escalation-v1";
import { laneOverallGrade, skuLaneRow } from "@/lib/studio-static-creative-lane/sku-lane-matrix";
import { evaluateWorkSupervision } from "@/lib/studio-work-supervision/evaluate";

/**
 * Controlled evidence that Step 2 supervision is live for Step 3.
 * Does not invent an Owner emergency. Does not remint Maya.
 */
describe("Step 3 — supervision is live in the mobile cert path", () => {
  it("resumes after accepted supervision and does not reopen frozen grades", () => {
    expect(mobile.supervisionAcceptedForSequencing).toBe(true);
    expect(mobile.resumeAfterPackageId).toBe(supervision.packageId);
    expect(mobile.sectionClosed).toBe(true);
    expect(mobile.status).toBe("CLOSED WITH EXPLICIT LIMITS");
    expect(skuLaneRow("v2-rtu-flyer").overall).toBe("READY_WITH_LIMITS");
    expect(laneOverallGrade()).toBe("NOT_CERTIFIED");
  });

  it("detects a silent stall, informs the customer once, and does not use Owner as first-line QA", () => {
    const result = evaluateWorkSupervision({
      campaignId: "716a15b6-d8d6-436c-8f84-9e8b40d2f959",
      nowMs: Date.parse("2026-09-16T16:00:00.000Z"),
      ownerAvailable: true,
      jobs: [
        {
          jobId: "716a15b6-d8d6-436c-8f84-9e8b40d2f959::v2-rtu-flyer",
          skuId: "v2-rtu-flyer",
          serviceName: "Make Me a Flyer",
          spineStatus: "revision_requested",
          productionAttemptsUsed: 1,
          pendingCustomerRevision: true,
          unresolvedQaFail: true,
          customerInformedOfIncident: false,
          waitingOnCustomer: false,
          failedTransport: false,
          missingAuthorizedNotice: false,
        },
      ],
    });

    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0]?.class).toBe("system_stall");
    expect(result.incidents[0]?.actor).toBe("supervisor");
    expect(result.customerMessages).toHaveLength(1);
    expect(result.customerMessages[0]?.revisionEntitlementProtected).toBe(true);
    expect(result.ownerEscalations).toHaveLength(0);
    expect(result.wouldAuthorizeSpend).toBe(false);
    expect(result.wouldCallProvider).toBe(false);
  });

  it("classifies exhausted recovery without manufacturing a RED Owner page", () => {
    const result = evaluateWorkSupervision({
      campaignId: "controlled-exhaust",
      nowMs: Date.now(),
      ownerAvailable: true,
      jobs: [
        {
          jobId: "controlled-exhaust::v2-rtu-menu",
          skuId: "v2-rtu-menu",
          spineStatus: "building_concepts",
          productionAttemptsUsed: 3,
          pendingCustomerRevision: false,
          unresolvedQaFail: true,
          customerInformedOfIncident: true,
          waitingOnCustomer: false,
          failedTransport: false,
          missingAuthorizedNotice: false,
        },
      ],
    });

    expect(result.incidents[0]?.class).toBe("recovery_exhausted");
    expect(result.incidents[0]?.ownerRequired).toBe(true);
    expect(result.wouldCallProvider).toBe(false);
  });
});
