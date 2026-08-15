import { describe, expect, it } from "vitest";

import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { payment } from "@/config/payment";
import { studioPaymentV1 } from "@/config/studio-payment-v1";
import { FLYER_PROOF_CONTRACT } from "@/lib/studio-design-renderer/contracts";
import { toClientFacingActivityMessage } from "@/lib/studio-board-client-copy";

describe("STUDIO-OPERATING-CUSTOMER-PAID-ENTRY-REPAIR-1 honesty", () => {
  it("does not tell customers live card processing is missing from this build", () => {
    expect(conversationRoomGuideV1.checkoutTaxesFeesNote).not.toMatch(
      /not applied in this build/i,
    );
    expect(conversationRoomGuideV1.checkoutTaxesFeesNote).toMatch(/Stripe/i);
    expect(payment.form.paymentSecurityNote).toMatch(/Stripe/i);
  });

  it("uses Continue to secure checkout, not a fake in-Studio card form", () => {
    expect(conversationRoomGuideV1.checkoutOpenPanelCta).toBe(
      payment.form.submitLabel,
    );
    expect(conversationRoomGuideV1.checkoutCompleteCta).toBe(
      payment.form.submitLabel,
    );
    expect(conversationRoomGuideV1.checkoutOpenPanelCta).not.toMatch(
      /show payment form/i,
    );
  });

  it("never congratulates sign-in for an unpaid created project", () => {
    expect(conversationRoomGuideV1.boardHandoffSignInLead).not.toMatch(
      /project has been created/i,
    );
    expect(toClientFacingActivityMessage("Route Map job selected: Make Me a Flyer.")).not.toMatch(
      /has been created/i,
    );
  });

  it("cancelled and failed checkout copy stay unpaid", () => {
    expect(studioPaymentV1.customerCopy.paymentCancelled).toMatch(/cancelled/i);
    expect(studioPaymentV1.customerCopy.paymentCancelled).not.toMatch(
      /project has been created/i,
    );
    expect(studioPaymentV1.customerCopy.paymentFailed).toMatch(/not completed/i);
    expect(studioPaymentV1.customerCopy.paymentFailed).not.toMatch(
      /project has been created/i,
    );
    expect(studioPaymentV1.customerCopy.paymentConfirmed).toMatch(/Payment confirmed/i);
  });

  it("sealed flyer contract does not require a customer logo", () => {
    expect(FLYER_PROOF_CONTRACT.customerLogoRequired).toBe(false);
  });
});
