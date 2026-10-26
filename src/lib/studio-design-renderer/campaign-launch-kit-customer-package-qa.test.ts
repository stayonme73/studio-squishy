import { describe, expect, it } from "vitest";

import { writeCopyFromFacts } from "@/lib/studio-copy-production/write";
import {
  renderEmailPasteReadyText,
  renderSmsPasteReadyText,
} from "@/lib/studio-copy-kit-light-harden/paste-ready-export";
import type { CopyProducerFacts } from "@/lib/studio-copy-production";
import { evaluateCampaignLaunchKitPackage } from "@/lib/studio-design-renderer/campaign-launch-kit-customer-package-qa";
import { buildCampaignLaunchKitUsageGuide } from "@/lib/studio-dispatch/campaign-launch-kit-brief";
import type { CampaignLaunchKitBrief } from "@/lib/studio-dispatch/campaign-launch-kit-brief";

const BRIEF: CampaignLaunchKitBrief = {
  businessName: "Harbor & Oak Home Services",
  objective: "Spring service you can trust",
  offerName: "Spring Tune-Up + Drain Clear",
  priceDisplay: "$189",
  wasPriceDisplay: "was $249",
  dateWindow: "March 10 – April 15, 2026",
  body: "HVAC tune-up and drain clear for homeowners who want plain, steady service.",
  cta: "Book online or call",
  phone: "(804) 555-0142",
  webDisplay: "harborandoak.example/book-tuneup",
  webUrl: "https://harborandoak.example/book-tuneup",
};

const SQUARE_LAYERS = [
  { type: "text", role: "body", content: BRIEF.body, y: 560, align: "center" },
  { type: "text", role: "offer", content: BRIEF.offerName, y: 620, align: "center" },
  { type: "text", role: "price", content: BRIEF.priceDisplay, y: 680, align: "center" },
];

function facts(price: string): CopyProducerFacts {
  const mustInclude = `${BRIEF.offerName} is ${price} at ${BRIEF.businessName}. ${BRIEF.dateWindow}. ${BRIEF.body} ${BRIEF.cta}: ${BRIEF.phone} or ${BRIEF.webDisplay}.`;
  return {
    skuId: "v2-rtu-email-kit",
    businessName: BRIEF.businessName,
    campaignGoal: BRIEF.objective,
    mustInclude,
    callToAction: BRIEF.cta,
    compliance: "You send this message. The Studio does not send it.",
    mustNotSay: "",
    messageCopy: "",
    sendingAccount: "Customer sends from their own account.",
    listConsent: "Yes. The customer owns the list and will send this.",
    emailCount: 1,
  };
}

function smsFacts(): CopyProducerFacts {
  return {
    ...facts("$189"),
    skuId: "v2-rtu-sms-kit",
    emailCount: undefined,
    messageCopy: [
      `${BRIEF.offerName} is $189 at ${BRIEF.businessName}. ${BRIEF.dateWindow}.`,
      `${BRIEF.cta}: ${BRIEF.phone} or ${BRIEF.webDisplay}.`,
    ].join("\n"),
  };
}

function inspect(emailText: string, smsText: string) {
  return evaluateCampaignLaunchKitPackage({
    brief: BRIEF,
    emailText,
    smsText,
    usageGuideText: buildCampaignLaunchKitUsageGuide(BRIEF),
    flyerText: `${BRIEF.businessName} ${BRIEF.priceDisplay} ${BRIEF.dateWindow} ${BRIEF.cta}`,
    flyerPngBytes: 20_000,
    flyerPdfBytes: 20_000,
    flyerPdfIsPdf: true,
    squarePngBytes: 20_000,
    portraitPngBytes: 20_000,
    squareLayers: SQUARE_LAYERS,
  });
}

describe("Campaign Launch Kit combined quality", () => {
  it("rejects a contradictory price and a missing text, then accepts the writer repair", () => {
    const brokenPrice = writeCopyFromFacts(facts("$99"));
    expect(brokenPrice.ok).toBe(true);
    if (!brokenPrice.ok || brokenPrice.submission.kind !== "email_set") {
      throw new Error("writer did not return an email");
    }
    const brokenEmail = renderEmailPasteReadyText(brokenPrice.submission.emails[0]!, 1);
    const sms = writeCopyFromFacts(smsFacts());
    expect(sms.ok).toBe(true);
    if (!sms.ok || sms.submission.kind !== "sms_set") throw new Error("writer did not return texts");
    const smsText = renderSmsPasteReadyText(sms.submission.smsMessages);
    const rejected = inspect(brokenEmail, smsText);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.code).toBe("CONTRADICTORY_FACTS");

    const missingSecond = inspect(brokenEmail.replaceAll("$99", "$189"), smsText.replace("Message 2", "Later note"));
    expect(missingSecond.ok).toBe(false);

    const repairedEmail = writeCopyFromFacts(facts("$189"));
    expect(repairedEmail.ok).toBe(true);
    if (!repairedEmail.ok || repairedEmail.submission.kind !== "email_set") {
      throw new Error("repair writer failed");
    }
    expect(repairedEmail.submission.emails).toHaveLength(1);
    const emailText = renderEmailPasteReadyText(repairedEmail.submission.emails[0]!, 1);
    const passed = inspect(emailText, smsText);
    expect(passed.ok).toBe(true);
    if (passed.ok) expect(passed.channels).toBe(4);
    expect(emailText).not.toMatch(/Email 2/);
    expect(smsText).toContain("Message 1");
    expect(smsText).toContain("Message 2");
    expect(emailText).toContain("$189");
    expect(emailText).not.toMatch(/CERTIFICATION FIXTURE|INTERNAL TEST/);
  });
});
