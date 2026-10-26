import { existsSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { studioCustomerReadyOperatingGuideV1 as guide } from "@/config/studio-customer-ready-operating-guide-v1";

const REPO = path.resolve(__dirname, "../../..");

describe("Customer-Ready Operating Guide — locked standing doctrine", () => {
  it("points at the locked doc, the menu checkpoint, and does not authorize Step 4", () => {
    expect(guide.locked).toBe(true);
    expect(guide.voiceIsLaunchRequirement).toBe(true);
    expect(guide.menuInventoryIsReportNotAuthorization).toBe(true);
    expect(guide.ownerConsole.doNotRebuild).toBe(true);
    expect(guide.currentStepId).toBe("owner_console_launch_certification");
    expect(guide.currentStepStatus).toBe("COMPLETE_BY_EVIDENCE_REUSE");
    expect(guide.ownerConsole.step5Status).toBe("COMPLETE_BY_EVIDENCE_REUSE");
    expect(guide.nextUnfinishedStepId).toBe("controlled_outside_customer_trial");
    expect(guide.doNotStartNextStepFromThisStamp).toBe(true);
    expect(guide.doNotStartStep4WithoutAuthorization).toBe(true);
    expect(existsSync(path.join(REPO, guide.authorityDoc))).toBe(true);
    expect(existsSync(path.join(REPO, guide.menuInventoryCheckpoint))).toBe(true);
    expect(existsSync(path.join(REPO, guide.dailyOperatingBridge))).toBe(true);
    expect(existsSync(path.join(REPO, guide.ownerAttentionHtml))).toBe(true);
    expect(guide.threeMenuSurfacesDecision).toBe("CLOSED");
    expect(
      existsSync(path.join(REPO, ".cursor/rules/customer-ready-operating-guide.mdc")),
    ).toBe(true);
  });
});
