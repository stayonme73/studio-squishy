import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioMobileCustomerJourneyCertificationV1 as cfg } from "@/config/studio-mobile-customer-journey-certification-v1";

describe("STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1", () => {
  it("opens inside Room 4 from the Gate X close tip without starting Room 5", () => {
    expect(cfg.packageId).toBe(
      "STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1",
    );
    expect(cfg.room).toBe(4);
    expect(cfg.status).toBe("CLOSED WITH EXPLICIT LIMITS");
    expect(cfg.sectionClosed).toBe(true);
    expect(cfg.parkClassification).toBe(
      "SUPERVISION_ACCEPTED_STEP_3_RESUME_AUTHORIZED",
    );
    expect(cfg.unparkedAt).toBe("2026-08-25");
    expect(cfg.livePhoneCertification).toBe("CLOSED_WITH_EXPLICIT_LIMITS");
    expect(cfg.step3AuthorizedAt).toBe("2026-09-16");
    expect(cfg.supervisionAcceptedForSequencing).toBe(true);
    expect(cfg.currentLanIp).toBe("10.1.10.208");
    expect(cfg.nextPhoneAction).toContain("CLOSED WITH EXPLICIT LIMITS");
    expect(cfg.nextPhoneAction).toContain("Do not remint Maya");
    expect(cfg.doNotRemintMaya).toBe(true);
    expect(cfg.doNotFabricateReviewStateForTheater).toBe(true);
    expect(cfg.closeoutDoc).toContain("STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CLOSEOUT.md");
    expect(cfg.defectMjd28BoardLostMayaBinding).toBe("MJ-D28");
    expect(cfg.nextMobileScreen).toBe("local-customer-one-maya-review");
    expect(cfg.currentMayaProofVersion).toBe("flyer-v16");
    expect(cfg.mayaJobId).toContain("716a15b6-d8d6-436c-8f84-9e8b40d2f959");
    expect(cfg.doNotReplaceStudioVersion18).toBe(true);
    expect(cfg.defectMjd25WrongReviewTarget).toBe("MJ-D25");
    expect(cfg.mjd16ManualEntryStatus).toBe("OWNER_ACCEPTED");
    expect(cfg.checkoutStageEntryScrollStatus).toBe("OWNER_ACCEPTED");
    expect(cfg.checkoutPaymentStatus).toBe(
      "SANDBOX_OWNER_ACCEPTED_STRIPE_NOT_CERTIFIED",
    );
    expect(cfg.checkoutSandboxPaymentAcceptedAt).toBe("2026-09-06");
    expect(cfg.checkoutPresentationStatus).toBe(
      "PENDING_OWNER_VISUAL_ACCEPTANCE",
    );
    expect(cfg.mjd22Status).toBe("FIXED_PENDING_OWNER_VISUAL_ACCEPTANCE");
    expect(cfg.stoppingPointCheckpointDoc).toContain(
      "2026-08-25-STOPPING-POINT-CHECKPOINT.md",
    );
    expect(cfg.readinessTip).toBe(
      "b35c8aa2c2fdc7b1f1f5161d38479fdded0e5361",
    );
    expect(cfg.resumeAfterPackageId).toBe(
      "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1",
    );
    expect(cfg.baseCommit).toBe("15ee699c7d16331b3f410871f02555841fddd4d6");
    expect(cfg.doNotAssignRoom4dOr4eLabel).toBe(true);
    expect(cfg.doNotStartRoom5).toBe(true);
    expect(cfg.doNotMerge).toBe(true);
    expect(cfg.doNotExecuteLivePhoneJourneyInOpening).toBe(true);
    expect(cfg.doNotStampCertificationResultInOpening).toBe(true);
    expect(cfg.doNotExecuteLivePhoneJourneyUntilOwnerAuthorization).toBe(true);
    expect(cfg.doNotStampCertificationResult).toBe(false);
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
    ).toBe(false);
    expect(cfg.gateXRemainsClosed).toBe(true);
    expect(cfg.gateXCloseTip).toBe("15ee699c7d16331b3f410871f02555841fddd4d6");
    expect(cfg.frozenLaunchNowServices.carousel).toBe("NOT ON LAUNCH MENU");
    expect(cfg.voiceChoiceStatus).toBe("OWNER_ACCEPTED");
    expect(cfg.visualMaster).toBe("MOBILE_VISUAL_MASTER");
    expect(cfg.nameQuestionStatus).toBe("OWNER_ACCEPTED");
    expect(cfg.nextMobileScreen).toBe("local-customer-one-maya-review");
    expect(cfg.reuseLockedMobileVisualSystem).toBe(true);
    expect(cfg.projectNeedStatus).toBe("OWNER_ACCEPTED");
    expect(cfg.businessNameStatus).toBe("OWNER_ACCEPTED");
    expect(cfg.tonightMobileVisualCheckpointAt).toBe("2026-08-29");
    expect(cfg.tonightMobileVisualCheckpointDoc).toContain(
      "2026-08-29-TONIGHT-MOBILE-VISUAL-CHECKPOINT.md",
    );
    expect(cfg.materialsConfirmationCheckpointAt).toBe("2026-08-30");
    expect(cfg.materialsConfirmationCheckpointDoc).toContain(
      "2026-08-30-MATERIALS-CONFIRMATION-CHECKPOINT.md",
    );
    expect(cfg.chooseYourRouteStatus).toBe("OWNER_ACCEPTED");
    expect(cfg.chooseYourRouteAcceptedAt).toBe("2026-08-30");
    expect(cfg.chooseYourRouteCheckpointDoc).toContain(
      "2026-08-30-CHOOSE-YOUR-ROUTE-CHECKPOINT.md",
    );
    expect(cfg.materialsBoardPresentationStatus).toBe("OWNER_ACCEPTED");
    expect(cfg.materialsBoardPresentationAcceptedAt).toBe("2026-09-08");
    expect(existsSync(join(process.cwd(), cfg.materialsBoardPresentationDoc))).toBe(
      true,
    );
    expect(cfg.boardTypographyColorHierarchyStatus).toBe("OWNER_ACCEPTED");
    expect(cfg.boardTypographyColorHierarchyAcceptedAt).toBe("2026-09-10");
    expect(existsSync(join(process.cwd(), cfg.boardTypographyColorHierarchyDoc))).toBe(
      true,
    );
    expect(cfg.samsungFixtureDownloadStatus).toBe("PROVEN");
    expect(cfg.step3StandardLightVisualStatus).toBe(
      "OPEN_FOLLOW_UP_NOT_OWNER_APPROVED",
    );
    expect(cfg.step3StandardLightVisualFollowUpAt).toBe("2026-09-05");
    expect(cfg.step3StandardLightVisualFollowUpDoc).toContain(
      "2026-09-05-STEP-3-STANDARD-LIGHT-VISUAL-FOLLOW-UP.md",
    );
    expect(cfg.selfCheckBeforeOwnerHandoff.status).toBe("LOCKED");
    expect(cfg.selfCheckBeforeOwnerHandoff.lockedAt).toBe("2026-09-05");
    expect(cfg.selfCheckBeforeOwnerHandoff.appliesForRemainderOfPackage).toBe(
      true,
    );
    expect(cfg.selfCheckBeforeOwnerHandoff.sequence).toBe(
      "builder-qa-proof-then-owner-acceptance",
    );
    expect(cfg.selfCheckBeforeOwnerHandoff.ownerSamsungRole).toBe(
      "FINAL_ACCEPTANCE_NOT_FIRST_QA",
    );
    expect(cfg.selfCheckBeforeOwnerHandoff.doNotReturnUnverifiedWork).toBe(true);
    expect(
      cfg.selfCheckBeforeOwnerHandoff.doNotChangeProductionToInspectFastStates,
    ).toBe(true);
    expect(existsSync(join(process.cwd(), cfg.samsungAcceptance20260906Doc))).toBe(
      true,
    );
    expect(
      existsSync(join(process.cwd(), cfg.selfCheckBeforeOwnerHandoff.cursorRule)),
    ).toBe(true);
    expect(cfg.proofMustInclude).toHaveLength(8);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoom).toBe(4);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoomClosed).toBe(false);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveSectionId).toBe(
      "owner-console-launch-certification",
    );
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveSectionStatus).toBe(
      "NOT_STARTED",
    );
    expect(
      studioLaunchReadinessExecutionOrderV1.mobileCustomerJourneyCertification.status,
    ).toBe("CLOSED WITH EXPLICIT LIMITS");
    expect(
      studioLaunchReadinessExecutionOrderV1.externalCustomerContentIntakeAndRightsCertification
        .status,
    ).toBe("CLOSED WITH EXPLICIT LIMITS");
    expect(studioLaunchReadinessExecutionOrderV1.room4C.sectionClosed).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.room4.doNotStartRoom5).toBe(true);
  });
});
