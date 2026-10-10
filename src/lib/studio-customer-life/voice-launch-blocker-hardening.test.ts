import { describe, expect, it } from "vitest";

import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";
import { studioLobbyPodiumGuidanceV1 } from "@/config/studio-lobby-podium-guidance-v1";
import {
  SOURCE_AUDIO_CUSTOMER_NOTICE,
  STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
} from "@/config/studio-source-audio-preflight-v1";
import type { SourceAudioPreflightRecord } from "@/lib/studio-source-audio-preflight/types";
import { studioVoiceLaunchBlockerHardeningV1 as harden } from "@/config/studio-voice-launch-blocker-hardening-v1";
import { studioVoiceMachineCustomerCommunicationV1 } from "@/config/studio-voice-machine-customer-communication-v1";
import type { CampaignRecord } from "@/config/studio-board";

import {
  answerCustomerLifeQuestion,
  classifyCustomerLifeQuestion,
} from "./answer-question";
import { listCanonicalLaunchPackages } from "@/lib/studio-canonical-menu-enforcement/enforcement";

const FLYER = ["v2-rtu-flyer"] as const;

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "voice-harden",
    campaignName: "Voice harden",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Hardening fixture",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: "2026-09-26T12:00:00.000Z",
    selectedCampaignOption: undefined,
    ...overrides,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      checkoutSessionId: "cs_voice",
      selectedServiceIds: [...FLYER],
      decisionId: "dec",
      factFingerprint: "fp",
      draftRevision: 1,
      ...overrides.paymentTruth,
    },
  } as CampaignRecord;
}

describe("STUDIO-OPERATING-STUDIO-VOICE-LAUNCH-BLOCKER-HARDENING-1", () => {
  it("does not revive Package 4 Voice Host and keeps an honest Lobby promise", () => {
    expect(harden.package4VoiceHost).toBe("discontinued_not_rebuilt");
    expect(studioLobbyPodiumGuidanceV1.spokenLine).toBe(harden.lobbySpokenLine);
    expect(studioLobbyPodiumGuidanceV1.spokenLine).not.toMatch(/from start to finish/i);
    expect(conversationRoomGuideV1.voiceHelpOpen).toBe(harden.helpOverlayVoice);
  });

  it("answers service-fit, price, and scope from canonical launch truth only", () => {
    const packages = listCanonicalLaunchPackages();
    expect(packages).toHaveLength(3);

    const confused = answerCustomerLifeQuestion(
      "I just need something for Instagram, I don’t know which one.",
      { campaign: null },
    );
    expect(confused.intent).toBe("service_fit");
    expect(confused.text).toMatch(/Social & Promo Graphics/);
    expect(confused.text).not.toMatch(/I will not guess which/);

    const price = answerCustomerLifeQuestion("How much is this going to cost me?", {
      campaign: campaign(),
    });
    expect(price.intent).toBe("pricing");
    expect(price.text).toMatch(/earlier Studio purchase/);
    expect(price.text).toMatch(/not a current price/);
    expect(price.text).not.toMatch(/Make Me a Flyer/i);

    const scope = answerCustomerLifeQuestion("So what exactly am I getting?", {
      campaign: campaign(),
    });
    expect(scope.intent).toBe("scope");
    expect(scope.text).toMatch(/Project Record shows what was purchased/);
    expect(scope.text).not.toMatch(/flyer/i);
  });

  it("maps realistic phrasing onto existing Machine intents", () => {
    expect(classifyCustomerLifeQuestion("I still don’t have the photos.")).toBe("need_anything");
    expect(classifyCustomerLifeQuestion("What's going on with my order?")).toBe("flyer_status");
    expect(classifyCustomerLifeQuestion("Can I change something?")).toBe("can_changes");
    expect(classifyCustomerLifeQuestion("I need a revision.")).toBe("can_changes");
    expect(classifyCustomerLifeQuestion("Where are my files?")).toBe("final_files");

    const materials = answerCustomerLifeQuestion("I still don’t have the photos.", {
      campaign: campaign({
        paymentReceivedAt: null,
        paymentTruth: {
          processor: "stripe",
          status: "initiated",
          currency: "usd",
          expectedAmountCents: 6900,
          selectedServiceIds: [...FLYER],
          decisionId: "dec",
          factFingerprint: "fp",
          draftRevision: 1,
        },
      }),
    });
    expect(materials.text).toBe(harden.materialsLaterPrePay);
  });

  it("does not narrate a missing session as a dead project record", () => {
    expect(
      studioVoiceMachineCustomerCommunicationV1.customerCopy.unsignedAskNotDeadRecord,
    ).not.toMatch(/could not reach the live project record/i);
    const local = answerCustomerLifeQuestion("How much is a flyer?", { campaign: null });
    expect(local.intent).toBe("pricing");
    expect(local.known).toBe(true);
  });

  it("speaks source-audio outcomes from the existing gate without inventing policy", () => {
    const record = (outcome: SourceAudioPreflightRecord["outcome"]): SourceAudioPreflightRecord => ({
      packageId: STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
      skuId: "v2-rtu-short-form-video-edit",
      outcome,
    });
    expect(
      answerCustomerLifeQuestion("Is my source audio okay?", {
        campaign: campaign({ sourceAudioPreflight: record("PASS") }),
      }).text,
    ).toBe(harden.sourceQualityPass);

    expect(
      answerCustomerLifeQuestion("There is background noise in my recording.", {
        campaign: campaign({ sourceAudioPreflight: record("NOTICE_AND_CHOICE") }),
      }).text,
    ).toBe(SOURCE_AUDIO_CUSTOMER_NOTICE);

    expect(
      answerCustomerLifeQuestion("Is my source recording usable?", {
        campaign: campaign({ sourceAudioPreflight: record("REPLACEMENT_REQUIRED") }),
      }).text,
    ).toBe(harden.sourceQualityReplacement);
  });

  it("records dissatisfaction, complaint, and refund without granting or denying", () => {
    const upset = answerCustomerLifeQuestion("This isn’t what I asked for.", {
      campaign: campaign(),
    });
    expect(upset.intent).toBe("dissatisfaction");
    expect(upset.text).toBe(harden.dissatisfactionAck);
    expect(upset.text).not.toMatch(/refund approved|refund denied|you will receive/i);

    const complaint = answerCustomerLifeQuestion("I want to file a complaint.", {
      campaign: campaign(),
    });
    expect(complaint.intent).toBe("complaint");
    expect(complaint.text).toBe(harden.complaintAck);

    const refund = answerCustomerLifeQuestion("I want a refund.", {
      campaign: campaign(),
    });
    expect(refund.intent).toBe("refund");
    expect(refund.text).toBe(harden.refundAck);
    expect(refund.text).toMatch(/will not grant a refund/i);
  });

  it("has honest payment-failure Voice and does not claim an activated order", () => {
    expect(conversationRoomGuideV1.checkoutPaymentFailedVoice).toMatch(/not completed/i);
    expect(conversationRoomGuideV1.checkoutPaymentFailedVoice).toMatch(/no order was activated/i);
    expect(conversationRoomGuideV1.checkoutPaymentCancelledVoice).toMatch(/did not complete/i);
    expect(conversationRoomGuideV1.checkoutPaymentCancelledVoice).not.toMatch(
      /payment is complete/i,
    );
  });

  it("greets a returning customer from account/Machine truth and fails closed without it", () => {
    const signedOut = answerCustomerLifeQuestion("I am a returning customer.", {
      campaign: null,
      account: { signedIn: false },
    });
    expect(signedOut.text).toBe(harden.returningSignedOut);

    const noProject = answerCustomerLifeQuestion("I am a returning customer.", {
      campaign: null,
      account: { signedIn: true, preferredName: "Maya" },
    });
    expect(noProject.text).toBe(harden.returningNoOpenProject);

    const open = answerCustomerLifeQuestion("I am a returning customer.", {
      campaign: campaign(),
      account: { signedIn: true, preferredName: "Maya" },
    });
    expect(open.text).toMatch(/Welcome back\. Maya\./);
    expect(open.text).toMatch(/Payment is confirmed/);
    expect(open.text).not.toMatch(/you are number|queue|tomorrow/i);
  });

  it("points pre-pay unknown questions away from a Board the customer does not have", () => {
    const unknown = answerCustomerLifeQuestion("What is Tagia's favorite color?", {
      campaign: campaign({
        paymentReceivedAt: null,
        paymentTruth: {
          processor: "stripe",
          status: "initiated",
          currency: "usd",
          expectedAmountCents: 6900,
          selectedServiceIds: [...FLYER],
          decisionId: "dec",
          factFingerprint: "fp",
          draftRevision: 1,
        },
      }),
    });
    expect(unknown.text).toBe(studioCustomerLifeV1.customerCopy.unknownFromRecordPrePay);
    expect(unknown.text).not.toMatch(/Studio Board/i);
  });
});
