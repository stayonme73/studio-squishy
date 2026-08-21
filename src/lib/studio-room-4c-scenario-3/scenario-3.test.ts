import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  MOSS_THREAD_AUTHORIZED_CLAIM,
  MOSS_THREAD_AUTHORIZED_LOCATION,
  MOSS_THREAD_PACKAGE_LOCKED,
  studioRoom4cScenario3MossAndThreadV1 as brief,
} from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";
import {
  MOSS_THREAD_CERTIFICATION_PHOTO_PACK,
  MOSS_THREAD_PHOTO_PACK_SHARED_RIGHTS,
} from "@/config/studio-room-4c-scenario-3-photo-pack-v1";
import { studioRoom4cMultiServiceClientGauntletV1 } from "@/config/studio-room-4c-multi-service-client-gauntlet-v1";

import { evaluateScenario3Acceptance } from "./acceptance";
import { hashScenario3Brief, SCENARIO_3_BRIEF_SHA256 } from "./brief";
import { evaluateScenario3CustomerFactSourceGate } from "./customer-fact-sources";
import {
  SCENARIO_3_STALE_LOCATION,
  assertScenario3ProductionRoutingAllowed,
} from "./fact-integrity";
import { evaluateScenario3PhotoPackIngest } from "./photo-pack-ingest";
import {
  evaluateScenario3PhotoAuthorityAgreement,
  photoAuthorityContradictsFixturePack,
} from "./photo-authority-agreement";
import {
  SCENARIO_3_PRODUCTION_AUTHORIZATION,
  scenario3ProductionAuthorizedByOwner,
} from "./production-authorization";
import {
  SCENARIO_3_OWNER_DELIVERY_APPROVAL,
  scenario3OwnerDeliveryApproved,
} from "./owner-delivery-approval";
import {
  assertScenario3FactsStamped,
  assertScenario3ProductionAuthorized,
  scenario3ProductionMayStart,
} from "./production-gate";

describe("Room 4C Scenario 3 — stamped brief + production authorized", () => {
  it("keeps the frozen brief hash and records owner delivery approval after production", () => {
    expect(studioRoom4cMultiServiceClientGauntletV1.scenarios[2]?.status).toBe(
      "PASS WITH EXPLICIT LIMITS",
    );
    expect(
      studioRoom4cMultiServiceClientGauntletV1.scenarios[2]?.classification,
    ).toBe("PASS WITH EXPLICIT LIMITS");
    expect(
      studioRoom4cMultiServiceClientGauntletV1.scenarios[2]?.productionHold,
    ).toBe("PRODUCTION_COMPLETE");
    expect(
      studioRoom4cMultiServiceClientGauntletV1.scenarios[2]
        ?.ownerApprovedForDelivery,
    ).toBe(true);
    expect(
      studioRoom4cMultiServiceClientGauntletV1.scenarios[2]
        ?.ownerVerificationPending,
    ).toBe(false);
    expect(brief.productionStatus).toBe("NOT_STARTED");
    expect(brief.factApprovalStatus).toBe("OWNER_APPROVED_FOR_CERTIFICATION");
    // Frozen brief hash still carries the historical pending flag; delivery
    // approval is stamped separately without mutating the brief.
    expect(brief.ownerVerificationPending).toBe(true);
    expect(brief.customer.locationDisplay).toBe(MOSS_THREAD_AUTHORIZED_LOCATION);
    expect(brief.offer.visitorClaim).toBe(MOSS_THREAD_AUTHORIZED_CLAIM);
    expect(JSON.stringify(brief)).not.toContain(SCENARIO_3_STALE_LOCATION);
    expect(brief.cta.phoneAuthorized).toBe(false);
    assertScenario3FactsStamped();
    expect(scenario3ProductionAuthorizedByOwner()).toBe(true);
    expect(SCENARIO_3_PRODUCTION_AUTHORIZATION.requiredBriefSha256).toBe(
      SCENARIO_3_BRIEF_SHA256,
    );
    expect(SCENARIO_3_PRODUCTION_AUTHORIZATION.postDeliveryOwnerReviewStillRequired).toBe(
      false,
    );
    expect(scenario3OwnerDeliveryApproved()).toBe(true);
    expect(SCENARIO_3_OWNER_DELIVERY_APPROVAL.classification).toBe(
      "PASS WITH EXPLICIT LIMITS",
    );
    expect(SCENARIO_3_OWNER_DELIVERY_APPROVAL.approvedVideoSha256).toBe(
      "638c00f4103d49c5cbcb4516cb0e4a91a79bb78742a3134099e0abbb3f99e376",
    );
    expect(scenario3ProductionMayStart()).toBe(true);
    expect(() => assertScenario3ProductionAuthorized()).not.toThrow();
    expect(studioRoom4cMultiServiceClientGauntletV1.status).toBe(
      "CLOSED WITH EXPLICIT LIMITS",
    );
    expect(studioRoom4cMultiServiceClientGauntletV1.sectionClosed).toBe(true);
    expect(studioRoom4cMultiServiceClientGauntletV1.room4RemainsOpen).toBe(true);
    expect(studioRoom4cMultiServiceClientGauntletV1.doNotStartRoom5).toBe(true);
    expect(
      studioRoom4cMultiServiceClientGauntletV1.frozenLaunchNowServices.carousel,
    ).toBe("NOT ON LAUNCH MENU");
  });

  it("preserves package-locked substance and the fictional certification stamp", () => {
    expect(brief.customer.businessName).toBe(MOSS_THREAD_PACKAGE_LOCKED.businessName);
    expect(brief.offer.name).toBe("Studio Open Weekend");
    expect(brief.offer.windowDisplay).toBe("November 7–8, 2026");
    expect(brief.fictional).toBe(true);
    expect(brief.certificationStatus).toMatch(/fictional/i);
    expect(brief.tone.distinctFromNia).toBe(true);
  });

  it("passes the generic customer-fact source gate against the stamped brief", () => {
    assertScenario3ProductionRoutingAllowed();
    const result = evaluateScenario3CustomerFactSourceGate();
    expect(result.findings).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("binds the ingested pack to exact hashes and does not label it customer-owned", () => {
    const result = evaluateScenario3PhotoPackIngest();
    expect(result.findings).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.hashBoundCount).toBe(4);
    expect(MOSS_THREAD_PHOTO_PACK_SHARED_RIGHTS.source).toBe(
      "STUDIO_GENERATED_CERTIFICATION_FIXTURE",
    );
    expect(MOSS_THREAD_PHOTO_PACK_SHARED_RIGHTS.customerOwned).toBe(false);
    expect(MOSS_THREAD_PHOTO_PACK_SHARED_RIGHTS.customerProvided).toBe(false);
    expect(MOSS_THREAD_CERTIFICATION_PHOTO_PACK).toHaveLength(4);
    for (const entry of result.entries) {
      expect(entry.hashMatch).toBe(true);
      expect(entry.labeledCustomerOwned).toBe(false);
      expect(entry.labeledCustomerProvided).toBe(false);
    }
  });

  it("admits the Launch Now request and releases production under owner authorization", () => {
    const acceptance = evaluateScenario3Acceptance();
    expect(acceptance.menuOk).toBe(true);
    expect(acceptance.factsApproved).toBe(true);
    expect(acceptance.factSourceGateOk).toBe(true);
    expect(acceptance.productionRoutingAllowed).toBe(true);
    expect(acceptance.photoRightsOk).toBe(true);
    expect(acceptance.ownerVerificationPending).toBe(true);
    expect(acceptance.productionAuthorized).toBe(true);
    expect(acceptance.admit).toBe(true);
    expect(acceptance.productionMayStart).toBe(true);
    expect(acceptance.findings).toEqual([]);
  });

  it("rejects a customer-ownership claim on a Studio certification fixture pack", () => {
    expect(
      photoAuthorityContradictsFixturePack({
        photoRights: brief.photoRights,
        packSource: MOSS_THREAD_PHOTO_PACK_SHARED_RIGHTS.source,
      }),
    ).toBe(false);
    expect(
      photoAuthorityContradictsFixturePack({
        photoRights: {
          source: "customer_supplied",
          customerOwned: true,
          authorizationBasis: "customer_owns",
        },
        packSource: "STUDIO_GENERATED_CERTIFICATION_FIXTURE",
      }),
    ).toBe(true);
    expect(brief.photoRights.source).toBe(
      "STUDIO_GENERATED_CERTIFICATION_FIXTURE",
    );
    expect(brief.photoRights.customerOwned).toBe(false);
    expect(brief.photoRights.customerProvided).toBe(false);
    expect(brief.photoRights.externalCustomerPhotoPathProven).toBe(false);
    expect(brief.photoRights.realExternalCustomerPhotoRightsCertified).toBe(
      false,
    );
  });

  it("keeps the authoritative brief, photo manifest, and rights record in agreement", () => {
    const agreement = evaluateScenario3PhotoAuthorityAgreement();
    expect(agreement.findings).toEqual([]);
    expect(agreement.ok).toBe(true);
  });

  it("hashes the stamped event brief stably", () => {
    expect(hashScenario3Brief()).toBe(SCENARIO_3_BRIEF_SHA256);
    const onDisk = readFileSync(
      path.join(
        process.cwd(),
        "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-3-moss-and-thread/campaign-brief.json",
      ),
      "utf8",
    );
    expect(hashScenario3Brief(onDisk)).toBe(SCENARIO_3_BRIEF_SHA256);
  });
});
