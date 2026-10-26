import { describe, expect, it } from "vitest";

import { studioOwnerDecisionClearsWaitV1 as cfg } from "@/config/studio-owner-decision-clears-wait-v1";
import {
  nextWorkStateAfterOwnerDecision,
  ownerDecisionShouldClearWait,
} from "@/lib/studio-customer-ready/owner-decision-clears-wait";

describe("Owner decision clears WAITING ON OWNER", () => {
  it("logs the stale-siren defect and the reusable Machine rule", () => {
    expect(cfg.defectId).toBe("OWNER-SEND-LEAVES-STALE-WAITING-ON-OWNER");
    expect(cfg.class).toBe("shared_lane");
    expect(cfg.ownerMustNotNeedScoutToClearSiren).toBe(true);
    expect(cfg.decisionActions).toEqual([
      "send",
      "approve",
      "reject",
      "send_back",
    ]);
  });

  it("clears WAITING ON OWNER after a valid send when no other Owner files remain", () => {
    expect(
      ownerDecisionShouldClearWait({
        action: "send",
        remainingOwnerFileCount: 0,
        workState: "WAITING_ON_OWNER",
      }),
    ).toBe(true);
  });

  it("does not clear if another Owner file is still on the desk", () => {
    expect(
      ownerDecisionShouldClearWait({
        action: "send",
        remainingOwnerFileCount: 1,
        workState: "WAITING_ON_OWNER",
      }),
    ).toBe(false);
  });

  it("does not treat hold or ask as a submitted decision", () => {
    expect(
      ownerDecisionShouldClearWait({
        action: "hold",
        remainingOwnerFileCount: 0,
        workState: "WAITING_ON_OWNER",
      }),
    ).toBe(false);
  });

  it("routes production work to WAITING ON SYSTEM and Scout work to ACTIVE", () => {
    expect(
      nextWorkStateAfterOwnerDecision({
        action: "send",
        assignedRecipient: "Production Team",
      }),
    ).toBe("WAITING_ON_SYSTEM");
    expect(nextWorkStateAfterOwnerDecision({ action: "send_back" })).toBe(
      "WAITING_ON_SYSTEM",
    );
    expect(nextWorkStateAfterOwnerDecision({ action: "approve" })).toBe(
      "ACTIVE_WORK",
    );
    expect(nextWorkStateAfterOwnerDecision({ action: "reject" })).toBe(
      "ACTIVE_WORK",
    );
  });
});
