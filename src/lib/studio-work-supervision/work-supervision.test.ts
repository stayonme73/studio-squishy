import { describe, expect, it } from "vitest";

import { studioWorkSupervisionV1 as cfg } from "@/config/studio-work-supervision-and-incident-escalation-v1";
import { laneOverallGrade, skuLaneRow } from "@/lib/studio-static-creative-lane/sku-lane-matrix";

import { customerMessageForIncident } from "./customer-message";
import { evaluateWorkSupervision } from "./evaluate";
import { SUPERVISION_ROLE_CHARTER } from "./roles";
import type { JobSupervisionFacts } from "./types";

function job(partial: Partial<JobSupervisionFacts> & Pick<JobSupervisionFacts, "jobId" | "skuId">): JobSupervisionFacts {
  return {
    productionAttemptsUsed: 0,
    pendingCustomerRevision: false,
    unresolvedQaFail: false,
    customerInformedOfIncident: false,
    waitingOnCustomer: false,
    failedTransport: false,
    missingAuthorizedNotice: false,
    spineStatus: "building_concepts",
    lastActivityAt: "2026-09-16T10:00:00.000Z",
    ...partial,
  };
}

const NOW = Date.parse("2026-09-16T12:00:00.000Z");

describe("Work Supervision + Incident Escalation", () => {
  it("does not reopen Static Creative Lane grades", () => {
    expect(cfg.doNotReopenStaticCreativeLane).toBe(true);
    expect(cfg.staticCreativeLaneFrozen).toEqual({
      flyer: "HOLD",
      otherFive: "NOT_CERTIFIED",
      lane: "NOT_CERTIFIED",
    });
    expect(skuLaneRow("v2-rtu-flyer").overall).toBe("READY_WITH_LIMITS");
    expect(skuLaneRow("v2-rtu-menu").overall).toBe("READY_WITH_LIMITS");
    expect(laneOverallGrade()).toBe("NOT_CERTIFIED");
    expect(cfg.substituteSolMediumStampAccepted).toBe(false);
    expect(cfg.doNotStartMobileCertification).toBe(true);
    expect(cfg.doNotRebuildOwnerConsole).toBe(true);
  });

  it("names one charter for every team role", () => {
    expect(SUPERVISION_ROLE_CHARTER.map((entry) => entry.role)).toEqual([
      ...cfg.roles,
    ]);
    for (const entry of SUPERVISION_ROLE_CHARTER) {
      expect(entry.mayDecide.length).toBeGreaterThan(10);
      expect(entry.mustNever.length).toBeGreaterThan(10);
    }
  });

  it("sends routine policy to Machine and never to Owner", () => {
    const result = evaluateWorkSupervision({
      campaignId: "c1",
      nowMs: NOW,
      ownerAvailable: true,
      jobs: [job({ jobId: "j1", skuId: "v2-rtu-social-posts", failedTransport: true })],
    });
    expect(result.incidents[0]?.class).toBe("routine_policy");
    expect(result.incidents[0]?.actor).toBe("machine");
    expect(result.ownerEscalations).toHaveLength(0);
    expect(result.wouldAuthorizeSpend).toBe(false);
    expect(result.wouldCallProvider).toBe(false);
  });

  it("keeps a Studio production defect inside the 1–3 attempt budget", () => {
    const result = evaluateWorkSupervision({
      campaignId: "c1",
      nowMs: NOW,
      ownerAvailable: true,
      jobs: [
        job({
          jobId: "j-menu",
          skuId: "v2-rtu-menu",
          unresolvedQaFail: true,
          productionAttemptsUsed: 1,
          customerInformedOfIncident: true,
        }),
      ],
    });
    expect(result.incidents[0]?.class).toBe("studio_production_defect");
    expect(result.incidents[0]?.actor).toBe("production_team_qa");
    expect(result.incidents[0]?.recovery).toBe("continue_internal_correction");
    expect(result.incidents[0]?.recoveryAttemptsMax).toBe(3);
    expect(result.ownerEscalations).toHaveLength(0);
  });

  it("detects a silent stall on any SKU and informs the customer", () => {
    const result = evaluateWorkSupervision({
      campaignId: "c1",
      nowMs: NOW,
      ownerAvailable: true,
      jobs: [
        job({
          jobId: "j-card",
          skuId: "v2-rtu-business-card",
          pendingCustomerRevision: true,
          unresolvedQaFail: true,
          customerInformedOfIncident: false,
        }),
      ],
    });
    expect(result.incidents[0]?.class).toBe("system_stall");
    expect(result.incidents[0]?.actor).toBe("supervisor");
    expect(result.incidents[0]?.customerMustBeInformed).toBe(true);
    expect(result.customerMessages[0]?.revisionEntitlementProtected).toBe(true);
    expect(result.customerMessages[0]?.whatHappened).toMatch(/stopped moving/i);
  });

  it("fail-closes email-kit, sms-kit, and service-sheet exhaust without Owner rescue", () => {
    for (const skuId of ["v2-rtu-email-kit", "v2-rtu-sms-kit", "v2-rtu-service-sheet"] as const) {
      const result = evaluateWorkSupervision({
        campaignId: "c1",
        nowMs: NOW,
        ownerAvailable: true,
        jobs: [
          job({
            jobId: `j-${skuId}`,
            skuId,
            unresolvedQaFail: true,
            productionAttemptsUsed: 3,
          }),
        ],
      });
      expect(result.incidents[0]?.class).toBe("recovery_exhausted");
      expect(result.incidents[0]?.actor).toBe("machine");
      expect(result.incidents[0]?.recovery).toBe("fail_closed_refund");
      expect(result.incidents[0]?.ownerRequired).toBe(false);
      expect(result.ownerEscalations).toHaveLength(0);
      expect(result.customerMessages[0]?.whatStudioIsDoing).toMatch(
        skuId === "v2-rtu-service-sheet"
          ? /will not finish the service sheet/i
          : /will not rewrite this copy/i,
      );
    }
  });

  it("fail-closes business-card exhaust without Owner rescue", () => {
    const result = evaluateWorkSupervision({
      campaignId: "c1",
      nowMs: NOW,
      ownerAvailable: true,
      jobs: [
        job({
          jobId: "j-card",
          skuId: "v2-rtu-business-card",
          unresolvedQaFail: true,
          productionAttemptsUsed: 3,
        }),
      ],
    });
    expect(result.incidents[0]?.class).toBe("recovery_exhausted");
    expect(result.incidents[0]?.actor).toBe("machine");
    expect(result.incidents[0]?.recovery).toBe("fail_closed_refund");
    expect(result.incidents[0]?.ownerRequired).toBe(false);
    expect(result.ownerEscalations).toHaveLength(0);
    expect(result.customerMessages[0]?.whatStudioIsDoing).toMatch(
      /will not finish the business card/i,
    );
  });

  it("fail-closes flyer exhaust without Owner rescue", () => {
    const result = evaluateWorkSupervision({
      campaignId: "c1",
      nowMs: NOW,
      ownerAvailable: true,
      jobs: [
        job({
          jobId: "j-flyer",
          skuId: "v2-rtu-flyer",
          unresolvedQaFail: true,
          productionAttemptsUsed: 3,
        }),
      ],
    });
    expect(result.incidents[0]?.class).toBe("recovery_exhausted");
    expect(result.incidents[0]?.actor).toBe("machine");
    expect(result.incidents[0]?.recovery).toBe("fail_closed_refund");
    expect(result.incidents[0]?.ownerRequired).toBe(false);
    expect(result.ownerEscalations).toHaveLength(0);
    expect(result.customerMessages[0]?.whatStudioIsDoing).toMatch(/will not finish the flyer/i);
  });

  it("fail-closes short-video exhaust without Owner rescue", () => {
    const result = evaluateWorkSupervision({
      campaignId: "c1",
      nowMs: NOW,
      ownerAvailable: true,
      jobs: [
        job({
          jobId: "j-video",
          skuId: "v2-rtu-short-video",
          unresolvedQaFail: true,
          productionAttemptsUsed: 3,
        }),
      ],
    });
    expect(result.incidents[0]?.class).toBe("recovery_exhausted");
    expect(result.incidents[0]?.actor).toBe("machine");
    expect(result.incidents[0]?.recovery).toBe("fail_closed_refund");
    expect(result.incidents[0]?.ownerRequired).toBe(false);
    expect(result.ownerEscalations).toHaveLength(0);
    expect(result.customerMessages[0]?.whatStudioIsDoing).toMatch(
      /will not finish the short video/i,
    );
  });

  it("still escalates voice exhaust to Owner", () => {
    const result = evaluateWorkSupervision({
      campaignId: "c1",
      nowMs: NOW,
      ownerAvailable: true,
      jobs: [
        job({
          jobId: "j-voice",
          skuId: "v2-rtu-voice",
          unresolvedQaFail: true,
          productionAttemptsUsed: 3,
        }),
      ],
    });
    expect(result.incidents[0]?.class).toBe("recovery_exhausted");
    expect(result.incidents[0]?.actor).toBe("owner");
    expect(result.ownerEscalations).toHaveLength(1);
  });

  it("holds the job when Owner judgment is required and Owner is unavailable", () => {
    const result = evaluateWorkSupervision({
      campaignId: "c1",
      nowMs: NOW,
      ownerAvailable: false,
      jobs: [
        job({
          jobId: "j-voice",
          skuId: "v2-rtu-voice",
          unresolvedQaFail: true,
          productionAttemptsUsed: 3,
        }),
      ],
    });
    expect(result.incidents[0]?.class).toBe("owner_unavailable_hold");
    expect(result.incidents[0]?.recovery).toBe("hold_owner_unavailable");
    expect(result.incidents[0]?.actor).not.toBe("owner");
    expect(result.ownerUnavailableHolds).toHaveLength(1);
    expect(result.customerMessages[0]?.whatStudioIsDoing).toMatch(/will not invent an Owner approval/);
  });

  it("keeps one active actor per job and never authorizes spend", () => {
    const result = evaluateWorkSupervision({
      campaignId: "c1",
      nowMs: NOW,
      ownerAvailable: true,
      jobs: [
        job({
          jobId: "same",
          skuId: "v2-rtu-voice",
          unresolvedQaFail: true,
          productionAttemptsUsed: 3,
          failedTransport: true,
        }),
      ],
    });
    expect(result.activeActorByJob.same).toBe("owner");
    expect(result.incidents).toHaveLength(1);
    expect(result.wouldAuthorizeSpend).toBe(false);
    expect(result.wouldCallProvider).toBe(false);
  });

  it("sends rights holds to Owner and Studio Manager review to Studio Manager", () => {
    const rights = evaluateWorkSupervision({
      campaignId: "c1",
      nowMs: NOW,
      ownerAvailable: true,
      jobs: [job({ jobId: "r", skuId: "v2-rtu-flyer", securityPrivacyRightsHold: true })],
    });
    expect(rights.incidents[0]?.class).toBe("security_privacy_rights");
    expect(rights.incidents[0]?.actor).toBe("owner");

    const manager = evaluateWorkSupervision({
      campaignId: "c1",
      nowMs: NOW,
      ownerAvailable: true,
      jobs: [
        job({
          jobId: "m",
          skuId: "v2-rtu-promotion-graphics",
          studioManagerReviewRequired: true,
        }),
      ],
    });
    expect(manager.incidents[0]?.actor).toBe("studio_manager");
    expect(manager.ownerEscalations).toHaveLength(0);
  });

  it("writes a complete customer incident message", () => {
    const message = customerMessageForIncident({
      class: "studio_production_defect",
      serviceName: "Launch flyer",
    });
    expect(message.whatHappened).toMatch(/not good enough/);
    expect(message.whatStudioIsDoing).toMatch(/QA/);
    expect(message.customerMustAct).toBe(false);
    expect(message.revisionEntitlementProtected).toBe(true);
    expect(message.whatHappensNext).toMatch(/revision has not been counted/);
  });

  it("does not treat a healthy moving job as an incident", () => {
    const result = evaluateWorkSupervision({
      campaignId: "c1",
      nowMs: NOW,
      ownerAvailable: true,
      jobs: [
        job({
          jobId: "ok",
          skuId: "v2-rtu-social-posts",
          spineStatus: "building_concepts",
          lastActivityAt: "2026-09-16T11:50:00.000Z",
        }),
      ],
    });
    expect(result.incidents).toHaveLength(0);
  });
});
