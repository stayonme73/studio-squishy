/**
 * STUDIO-OPERATING-DESIGN-RM-J007-POSTPAY-UPDATE-DISPATCH-STRUCTURE-1
 */

import { describe, expect, it } from "vitest";

import {
  buildRmJ007PostPayDispatchStructureFromPaymentSeal,
  evaluateRmJ007UpdatePaymentGate,
  type RmJ007LiveUpdateLockInput,
} from "@/lib/studio-design-renderer";

function harborUpdateLock(): RmJ007LiveUpdateLockInput {
  return {
    businessName: "Harbor & Oak Studio",
    itemIdentity: "Spring Portrait Session flyer",
    referenceMaterialNote: "PNG of the current March flyer attached",
    whatChange: "Change date March→April and price $49→$59",
    newInfo: "April 12 · $59",
    whereLive: "Facebook event + lobby stand",
    acceptRecreationLimits: "Yes",
  };
}

describe("STUDIO-OPERATING-DESIGN-RM-J007-POSTPAY-UPDATE-DISPATCH-STRUCTURE-1", () => {
  it("builds durable 1-member structure from payment seal", () => {
    const gate = evaluateRmJ007UpdatePaymentGate({
      selectedServiceIds: ["rm-j007"],
      updateLock: harborUpdateLock(),
    });
    expect(gate.ok && gate.applicable).toBe(true);
    if (!gate.ok || !gate.applicable) return;

    const built = buildRmJ007PostPayDispatchStructureFromPaymentSeal(gate.seal);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.structure.lockedPackageMemberCount).toBe(1);
    expect(built.structure.members[0]!.memberId).toBe("updated_promotion");
    expect(built.structure.fulfillmentMode).toBe("recreation");
    expect(built.structure.acceptRecreationLimits).toBe(true);
    expect(built.structure.redesignRequested).toBe(false);
    expect(built.structure.canvaRequired).toBe(false);
    expect(built.structure.rendererInvoked).toBe(false);
    expect(built.structure.dispatchHookAuthorized).toBe(false);
    expect(built.structure.packageFingerprint).toBe(gate.seal.packageFingerprint);
  });

  it("fails closed without payment seal", () => {
    const built = buildRmJ007PostPayDispatchStructureFromPaymentSeal(null);
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.code).toBe("MISSING_PAYMENT_SEAL");
  });
});
