import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { studioCustomerReadyOperatingGuideV1 as guide } from "@/config/studio-customer-ready-operating-guide-v1";
import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioPreLaunchMasterCloseoutRegisterV1 } from "@/config/studio-pre-launch-master-closeout-register-v1";
import { studioRoom3OwnerConsoleWholeDeskRehearsalAndCloseoutV1 } from "@/config/studio-room-3-owner-console-whole-desk-rehearsal-and-closeout-v1";
import { studioSinglePageOwnerWorkAndAttentionConsoleV1 } from "@/config/studio-single-page-owner-work-and-attention-console-v1";
import { studioStep5OwnerConsoleLaunchCertificationV1 as stamp } from "@/config/studio-step-5-owner-console-launch-certification-v1";

const REPO = path.resolve(__dirname, "../../..");

describe("STUDIO-OPERATING-STEP-5-OWNER-CONSOLE-LAUNCH-CERTIFICATION-1", () => {
  it("marks Step 5 complete by Owner evidence reuse without reopening Room 3 or the parked console", () => {
    expect(stamp.verdict).toBe("COMPLETE_BY_EVIDENCE_REUSE");
    expect(stamp.acceptance).toBe("owner_evidence_reuse");
    expect(guide.currentStepStatus).toBe("COMPLETE_BY_EVIDENCE_REUSE");
    expect(guide.ownerConsole.step5Status).toBe("COMPLETE_BY_EVIDENCE_REUSE");
    expect(guide.ownerConsole.doNotRebuild).toBe(true);
    expect(studioRoom3OwnerConsoleWholeDeskRehearsalAndCloseoutV1.roomClosed).toBe(
      true,
    );
    expect(studioRoom3OwnerConsoleWholeDeskRehearsalAndCloseoutV1.closeTip).toBe(
      "cd2a1e2",
    );
    expect(studioSinglePageOwnerWorkAndAttentionConsoleV1.status).toBe(
      "PARKED / HOLD",
    );
    expect(stamp.parkedConsoleStatus).toBe("PARKED / HOLD");
    expect(stamp.liveWalkRerun).toBe(false);
    expect(stamp.nextPackageStarted).toBe(false);
    expect(stamp.doNotStartNextFromThisStamp).toBe(true);
    expect(stamp.nextPackageId).toBe(
      "STUDIO-OPERATING-VOICE-MACHINE-TEAM-STRESS-1",
    );
    expect(stamp.nextPackageStarted).toBe(false);
    expect(
      studioPreLaunchMasterCloseoutRegisterV1.recommendedNextSinglePackage
        .status,
    ).toBe("NOT_STARTED");
    expect(
      studioLaunchReadinessExecutionOrderV1.preLaunchMasterCloseoutRegister
        .recommendedNextPackageStatus,
    ).toBe("NOT_STARTED");
    expect(existsSync(path.join(REPO, stamp.stampDoc))).toBe(true);
    expect(existsSync(path.join(REPO, stamp.proofJson))).toBe(true);
    const proof = JSON.parse(
      readFileSync(path.join(REPO, stamp.proofJson), "utf8"),
    ) as { consoleUnparked: boolean; room3Reopened: boolean };
    expect(proof.consoleUnparked).toBe(false);
    expect(proof.room3Reopened).toBe(false);
  });
});
