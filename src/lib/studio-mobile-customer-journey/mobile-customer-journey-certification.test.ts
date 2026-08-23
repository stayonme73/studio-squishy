import { describe, expect, it } from "vitest";

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioMobileCustomerJourneyCertificationV1 as cfg } from "@/config/studio-mobile-customer-journey-certification-v1";

describe("STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1", () => {
  it("opens inside Room 4 from the Gate X close tip without starting Room 5", () => {
    expect(cfg.packageId).toBe(
      "STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1",
    );
    expect(cfg.room).toBe(4);
    expect(cfg.status).toBe("OPEN");
    expect(cfg.sectionClosed).toBe(false);
    expect(cfg.baseCommit).toBe("15ee699c7d16331b3f410871f02555841fddd4d6");
    expect(cfg.doNotAssignRoom4dOr4eLabel).toBe(true);
    expect(cfg.doNotStartRoom5).toBe(true);
    expect(cfg.doNotMerge).toBe(true);
    expect(cfg.doNotExecuteLivePhoneJourneyInOpening).toBe(true);
    expect(cfg.doNotStampCertificationResultInOpening).toBe(true);
    expect(cfg.doNotExecuteLivePhoneJourneyUntilOwnerAuthorization).toBe(true);
    expect(cfg.doNotStampCertificationResult).toBe(true);
    expect(cfg.openingArtifactsOnly).toBe(false);
    expect(cfg.readinessPassComplete).toBe(true);
    expect(cfg.phoneAccessMethod).toBe("local_https_lan");
    expect(
      studioLaunchReadinessExecutionOrderV1.mobileCustomerJourneyCertification
        .readinessPassComplete,
    ).toBe(true);
    expect(
      studioLaunchReadinessExecutionOrderV1.mobileCustomerJourneyCertification
        .doNotStampCertificationResult,
    ).toBe(true);
    expect(cfg.gateXRemainsClosed).toBe(true);
    expect(cfg.gateXCloseTip).toBe("15ee699c7d16331b3f410871f02555841fddd4d6");
    expect(cfg.frozenLaunchNowServices.carousel).toBe("NOT ON LAUNCH MENU");
    expect(cfg.proofMustInclude).toHaveLength(8);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoom).toBe(4);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoomClosed).toBe(false);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveSectionId).toBe(
      "mobile-customer-journey-certification",
    );
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveSectionStatus).toBe("OPEN");
    expect(
      studioLaunchReadinessExecutionOrderV1.mobileCustomerJourneyCertification.status,
    ).toBe("OPEN");
    expect(
      studioLaunchReadinessExecutionOrderV1.externalCustomerContentIntakeAndRightsCertification
        .status,
    ).toBe("CLOSED WITH EXPLICIT LIMITS");
    expect(studioLaunchReadinessExecutionOrderV1.room4C.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room4.doNotStartRoom5).toBe(true);
  });
});
