import { describe, expect, it } from "vitest";

import { REFUND_REQUEST_CHANNEL_IDS } from "@/config/refund-request-channels";
import { REFUND_INTAKE_CASUAL_PROMPT } from "./refund-request-intake";
import {
  REFUND_VOICE_INPUT_REJECTED_PROMPT,
  evaluateClientRefundChannelRequest,
  messageMentionsRefundCasually,
  resolveSourceChannelFromEvent,
} from "./refund-request-routing";

describe("refund-request-routing", () => {
  it("lists all V1 client channels as text-only", () => {
    expect(REFUND_REQUEST_CHANNEL_IDS).toHaveLength(5);
    for (const id of REFUND_REQUEST_CHANNEL_IDS) {
      const route = evaluateClientRefundChannelRequest({
        eventType: "refund_request",
        sourceChannel: id,
        facts: { reason: "Too slow", requestedOutcome: "Full refund" },
      });
      expect(route.kind).toBe("submit");
      if (route.kind === "submit") {
        expect(route.sourceChannel).toBe(id);
      }
    }
  });

  it("detects casual refund language", () => {
    expect(messageMentionsRefundCasually("I want a refund")).toBe(true);
    expect(messageMentionsRefundCasually("Can we continue tomorrow?")).toBe(false);
  });

  it("starts structured intake for casual Squishy chat", () => {
    const route = evaluateClientRefundChannelRequest({
      eventType: "refund_request",
      message: "I want a refund",
    });
    expect(route.kind).toBe("intake_required");
    if (route.kind === "intake_required") {
      expect(route.squishyMessage).toBe(REFUND_INTAKE_CASUAL_PROMPT);
      expect(route.sourceChannel).toBe("squishy_chat_post_payment");
    }
  });

  it("routes Review Room casual refund message through intake", () => {
    const route = evaluateClientRefundChannelRequest({
      eventType: "revision_message",
      message: "I want a refund please",
      facts: {},
    });
    expect(route.kind).toBe("intake_required");
    if (route.kind === "intake_required") {
      expect(route.sourceChannel).toBe("review_room_message");
    }
  });

  it("routes Studio Board help casual refund through intake", () => {
    const route = evaluateClientRefundChannelRequest({
      eventType: "payment_question",
      message: "I need a refund",
    });
    expect(route.kind).toBe("intake_required");
    if (route.kind === "intake_required") {
      expect(route.sourceChannel).toBe("studio_board_help");
    }
  });

  it("routes Final Delivery help casual refund through intake", () => {
    const route = evaluateClientRefundChannelRequest({
      eventType: "general_inquiry",
      message: "requesting a refund",
    });
    expect(route.kind).toBe("intake_required");
    if (route.kind === "intake_required") {
      expect(route.sourceChannel).toBe("final_delivery_help");
    }
  });

  it("rejects voice input for refund on every channel", () => {
    for (const id of REFUND_REQUEST_CHANNEL_IDS) {
      const route = evaluateClientRefundChannelRequest({
        eventType: "refund_request",
        sourceChannel: id,
        inputMode: "voice",
        message: "I want a refund because the project stalled",
        facts: { reason: "Project stalled", requestedOutcome: "Full refund" },
      });
      expect(route.kind).toBe("reject_voice");
      if (route.kind === "reject_voice") {
        expect(route.squishyMessage).toBe(REFUND_VOICE_INPUT_REJECTED_PROMPT);
      }
    }
  });

  it("submits complete structured intake with source channel", () => {
    const route = evaluateClientRefundChannelRequest({
      eventType: "refund_request",
      sourceChannel: "structured_customer_form",
      facts: {
        reason: "No response in two weeks",
        requestedOutcome: "Full refund",
        supportingDetails: "Paid on June 1.",
      },
    });
    expect(route.kind).toBe("submit");
    if (route.kind === "submit") {
      expect(route.intake.sourceChannel).toBe("structured_customer_form");
      expect(route.intake.reason).toBe("No response in two weeks");
    }
  });

  it("maps events to default channels when sourceChannel omitted", () => {
    expect(resolveSourceChannelFromEvent("revision_message")).toBe("review_room_message");
    expect(resolveSourceChannelFromEvent("payment_question")).toBe("studio_board_help");
    expect(resolveSourceChannelFromEvent("general_inquiry")).toBe("final_delivery_help");
  });
});
