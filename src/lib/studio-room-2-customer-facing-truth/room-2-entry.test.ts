import { describe, expect, it } from "vitest";

import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { payment } from "@/config/payment";
import { PROJECT_BUILDER_V1 } from "@/config/project-builder-v1";
import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioLobbyEntryV1 } from "@/config/studio-lobby-entry-v1";
import { studioPaymentV1 } from "@/config/studio-payment-v1";
import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";
import { studioRoom2CustomerFacingTruthAndFrictionEntryV1 as cfg } from "@/config/studio-room-2-customer-facing-truth-and-friction-entry-v1";

const THIS_BUILD = /this build/i;

describe("STUDIO-OPERATING-ROOM-2-CUSTOMER-FACING-TRUTH-AND-FRICTION-ENTRY-1", () => {
  it("enters Room 2 without a full Room 1 CLOSED stamp and parks for Manager", () => {
    expect(cfg.packageId).toBe(
      "STUDIO-OPERATING-ROOM-2-CUSTOMER-FACING-TRUTH-AND-FRICTION-ENTRY-1",
    );
    expect(cfg.room).toBe(2);
    expect(cfg.parkForManager).toBe(true);
    expect(cfg.doNotAutoAdvance).toBe(true);
    expect(cfg.doNotStartOwnerConsole).toBe(true);
    expect(cfg.doNotReopenResend).toBe(true);
    expect(cfg.visualRedesign).toBe(false);
    expect(cfg.merge).toBe("separately_authorized");
    expect(studioRoom1CustomerLifeCloseoutV1.roomClosed).toBe(false);
    expect(studioRoom1CustomerLifeCloseoutV1.room2Authorized).toBe(true);
    expect(studioLaunchReadinessExecutionOrderV1.currentActiveRoom).toBe(2);
    expect(cfg.comeBackLaterEmail.protectedCheckpoint).toBe("d6974eb");
    expect(cfg.comeBackLaterEmail.doesNotBlockRoom2).toBe(true);
    expect(cfg.outOfScope).toEqual(
      expect.arrayContaining([
        "owner_console",
        "branded_sender_certification",
        "real_inbox_delivery_proof",
        "merge",
      ]),
    );
  });

  it("keeps first-section spine at Lobby through payment handoff", () => {
    expect([...cfg.scopedSpine]).toEqual([
      "lobby-entry",
      "conversation-room",
      "recommendation-service-selection",
      "project-review",
      "payment-handoff",
    ]);
  });

  it("keeps recommendation language as a suggestion, not a forced plan", () => {
    expect(conversationRoomGuideV1.routeRecommendedBadge).toBe(
      "Suggested starting point",
    );
    expect(conversationRoomGuideV1.routePanelLead).toMatch(/you can choose a different path/i);
    expect(conversationRoomGuideV1.routeDirectTagline).not.toMatch(/squishy/i);
    expect(conversationRoomGuideV1.checkoutOpenPanelCta).toBe("Open checkout");
    expect(conversationRoomGuideV1.checkoutOpenPanelCta).not.toBe(
      conversationRoomGuideV1.checkoutCompleteCta,
    );
    expect(conversationRoomGuideV1.checkoutCompleteCta).toBe(
      payment.form.submitLabel,
    );
  });

  it("does not tell customers checkout is unfinished, emails are off, or Stripe env secrets leaked", () => {
    expect(payment.whatsNext.emailReassurance).not.toMatch(THIS_BUILD);
    expect(payment.whatsNext.emailReassurance).not.toMatch(/not sent/i);
    expect(payment.whatsNext.emailReassurance).toMatch(/studio board is the source of truth/i);
    expect(payment.summary.cardProcessingDisclosureNote).not.toMatch(THIS_BUILD);
    expect(payment.summary.cardProcessingDisclosureNote).not.toMatch(/server-side/i);
    expect(payment.summary.cardProcessingDisclosureNote).toMatch(/stripe/i);
    expect(PROJECT_BUILDER_V1.checkoutNotLiveNote).not.toMatch(THIS_BUILD);
    expect(PROJECT_BUILDER_V1.checkoutNotLiveNote).not.toMatch(/not connected/i);
    expect(studioPaymentV1.customerCopy.processorCredentialsInvalid).not.toMatch(
      /STRIPE_SECRET_KEY|sk_test_|sk_live_/,
    );
    expect(studioPaymentV1.customerCopy.processorSessionFailed).not.toMatch(
      /credentials|STRIPE_SECRET_KEY|sk_test_/,
    );
    expect(conversationRoomGuideV1.checkoutTaxesFeesNote).not.toMatch(THIS_BUILD);
  });

  it("keeps Lobby entry copy free of Squishy and unfinished-build jargon", () => {
    const copy = JSON.stringify(studioLobbyEntryV1.copy);
    expect(copy).not.toMatch(/squishy/i);
    expect(copy).not.toMatch(THIS_BUILD);
    expect(studioLobbyEntryV1.copy.newToStudio.description).toMatch(/guided conversation/i);
  });
});
