/**
 * STUDIO-OPERATING-DESIGN-RM-J007-INTAKE-PAYMENT-LOCK-1
 */

import { describe, expect, it } from "vitest";

import { WORKING_DRAFT_PERSISTED_FIELDS } from "@/config/studio-working-draft-v1";
import {
  assertRmJ007UpdateReadyForPayment,
  evaluateRmJ007UpdatePaymentGate,
  mapRmJ007UpdateLockFromLiveTruth,
  RM_J007_FORBIDDEN_REDESIGN_INTAKE_FIELDS,
  type RmJ007LiveUpdateLockInput,
} from "@/lib/studio-design-renderer";

function harborUpdateLock(
  overrides: Partial<RmJ007LiveUpdateLockInput> = {},
): RmJ007LiveUpdateLockInput {
  return {
    businessName: "Harbor & Oak Studio",
    itemIdentity: "Spring Portrait Session flyer",
    referenceMaterialNote: "PNG of the current March flyer attached",
    whatChange: "Change date March→April and price $49→$59",
    newInfo: "April 12 · $59 · phone (555) 010-2299",
    whereLive: "Facebook event + lobby stand",
    acceptRecreationLimits: "Yes",
    ...overrides,
  };
}

describe("STUDIO-OPERATING-DESIGN-RM-J007-INTAKE-PAYMENT-LOCK-1", () => {
  it("working draft persists rmj007UpdateLock field", () => {
    expect(WORKING_DRAFT_PERSISTED_FIELDS).toContain("rmj007UpdateLock");
  });

  it("maps live lock → 1-member recreation truth", () => {
    const mapped = mapRmJ007UpdateLockFromLiveTruth(harborUpdateLock());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.lockedPackageMemberCount).toBe(1);
    expect(mapped.truth.plannedMembers[0]!.memberId).toBe("updated_promotion");
    expect(mapped.truth.acceptRecreationLimits).toBe(true);
    expect(mapped.truth.redesignRequested).toBe(false);
    expect(mapped.truth.fulfillmentMode).toBe("recreation");
    expect(mapped.truth.canvaRequired).toBe(false);
  });

  it("accepts itemLink as item identity alternate", () => {
    const mapped = mapRmJ007UpdateLockFromLiveTruth(
      harborUpdateLock({
        itemIdentity: undefined,
        itemLink: "https://example.com/flyer-march.png",
      }),
    );
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.startingPoint.itemIdentity).toContain("example.com");
  });

  it("fail closed: sku-only, missing acceptance, redesign fields", () => {
    const skuOnly = assertRmJ007UpdateReadyForPayment({
      selectedServiceIds: ["rm-j007"],
      updateLock: null,
    });
    expect(skuOnly.ok).toBe(false);
    if (!skuOnly.ok) expect(skuOnly.code).toBe("SKU_ONLY_INSUFFICIENT");

    const noAccept = mapRmJ007UpdateLockFromLiveTruth(
      harborUpdateLock({ acceptRecreationLimits: "No" }),
    );
    expect(noAccept.ok).toBe(false);
    if (!noAccept.ok) expect(noAccept.code).toBe("MISSING_ACCEPTANCE");

    for (const field of [
      "redesignRequested",
      "newConcept",
      "editCanvaFile",
    ] as const) {
      expect(RM_J007_FORBIDDEN_REDESIGN_INTAKE_FIELDS).toContain(field);
      const bad = mapRmJ007UpdateLockFromLiveTruth(
        harborUpdateLock({ [field]: "yes" }),
      );
      expect(bad.ok).toBe(false);
      if (!bad.ok) expect(bad.code).toBe("REDESIGN_REQUESTED");
    }
  });

  it("payment gate seals when lock is complete; skips when sku not selected", () => {
    const skip = evaluateRmJ007UpdatePaymentGate({
      selectedServiceIds: ["bf-001"],
      updateLock: null,
    });
    expect(skip.ok).toBe(true);
    if (skip.ok) expect(skip.applicable).toBe(false);

    const gate = evaluateRmJ007UpdatePaymentGate({
      selectedServiceIds: ["rm-j007"],
      updateLock: harborUpdateLock(),
    });
    expect(gate.ok).toBe(true);
    if (!gate.ok || !gate.applicable) return;
    expect(gate.seal.lockedPackageMemberCount).toBe(1);
    expect(gate.seal.memberIds).toEqual(["updated_promotion"]);
    expect(gate.seal.acceptRecreationLimits).toBe(true);
    expect(gate.seal.canvaRequired).toBe(false);
    expect(gate.seal.fulfillmentMode).toBe("recreation");
  });
});
