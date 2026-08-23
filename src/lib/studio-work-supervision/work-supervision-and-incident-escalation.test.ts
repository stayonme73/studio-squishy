import { describe, expect, it } from "vitest";

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioMobileCustomerJourneyCertificationV1 as mobile } from "@/config/studio-mobile-customer-journey-certification-v1";
import { studioWorkSupervisionAndIncidentEscalationV1 as cfg } from "@/config/studio-work-supervision-and-incident-escalation-v1";

describe("STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1", () => {
  it("stays OPEN in Room 4 for foundation pass 1 without closing or starting Room 5", () => {
    expect(cfg.packageId).toBe(
      "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1",
    );
    expect(cfg.room).toBe(4);
    expect(cfg.status).toBe("OPEN");
    expect(cfg.progress).toBe("IN_PROGRESS");
    expect(cfg.openingArtifactsOnly).toBe(false);
    expect(cfg.implementationAuthorized).toBe(true);
    expect(cfg.foundationPass).toBe(1);
    expect(cfg.packageClosed).toBe(false);
    expect(cfg.baseCommit).toBe(
      "bc458931c46ed845b982f62a4c70f8a312c169c8",
    );
    expect(cfg.doNotAssignRoom4dOr4eLabel).toBe(true);
    expect(cfg.doNotStartRoom5).toBe(true);
    expect(cfg.doNotMerge).toBe(true);
    expect(cfg.doNotClaimClaudeConnected).toBe(true);
    expect(cfg.doNotClaimBuildABotConnected).toBe(true);
    expect(cfg.doNotClaimResendLive).toBe(true);
    expect(cfg.squishyWatchkeeperAsset).toBe(
      "public/squishy/squishy-studio-guide-v1.png",
    );
    expect(cfg.squishyForbiddenOnSecurityIncidents).toBe(true);
    expect(mobile.status).toBe("PARKED");
    expect(mobile.sectionClosed).toBe(false);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoom).toBe(4);
    expect(
      studioLaunchReadinessExecutionOrderV1.currentActiveRoomClosed,
    ).toBe(false);
    expect(
      studioLaunchReadinessExecutionOrderV1.currentActiveSectionId,
    ).toBe("work-supervision-and-incident-escalation");
    expect(
      studioLaunchReadinessExecutionOrderV1.currentActiveSectionStatus,
    ).toBe("OPEN");
    expect(
      studioLaunchReadinessExecutionOrderV1.mobileCustomerJourneyCertification
        .status,
    ).toBe("PARKED");
    expect(
      studioLaunchReadinessExecutionOrderV1.workSupervisionAndIncidentEscalation
        .status,
    ).toBe("OPEN");
    expect(studioLaunchReadinessExecutionOrderV1.room5RemainsNotStarted).toBe(
      true,
    );
  });
});
