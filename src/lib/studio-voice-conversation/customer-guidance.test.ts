import { describe, expect, it } from "vitest";

import { buildStudioVoiceAnthropicBody } from "./anthropic-reply";
import {
  isApprovedStudioVoiceGuide,
  STUDIO_VOICE_ROUTES,
} from "./customer-guidance";
import { guidedAnswerInsteadOfRefusal } from "./fallback";
import { buildStudioVoiceFactsCard } from "./facts-card";
import { runStudioVoiceTurn } from "./run-turn";

const ORIGINAL = [
  "How can I pay?",
  "Do you accept credit cards?",
  "When do I pay?",
  "My payment failed.",
  "Did my payment go through?",
  "Where do I enter my card?",
  "What packages do you offer?",
  "What's included in Campaign Launch Kit?",
  "How much is Clip Repurposing?",
  "Which package should I buy?",
  "What happens next?",
  "What do I do after I pay?",
  "I want a refund.",
  "I want to file a complaint.",
  "What is the mayor's favorite color?",
  "How do I contact The Studio?",
] as const;

async function ask(question: string) {
  return runStudioVoiceTurn({ question, allowProvider: false });
}

describe("studio voice customer-service training", () => {
  it("keeps the four-package facts card and the closed-checkout desk", () => {
    const card = buildStudioVoiceFactsCard();
    expect(card.packages.map((row) => row.name)).toEqual([
      "Clip Repurposing",
      "Short-Form Video Editing",
      "Social & Promo Graphics",
      "Campaign Launch Kit",
    ]);
    expect(card.packages.map((row) => [row.listDisplay, row.dueDisplay])).toEqual([
      ["$373.75", "$299"],
      ["$186.25", "$149"],
      ["$199", "$159.20"],
      ["$349", "$279.20"],
    ]);
    expect(card.deskGuidance.liveCheckoutOpen).toBe(false);
    expect(card.deskGuidance.taxResolved).toBe(false);
    expect(card.deskGuidance.acceptedPaymentMethods).toBe("not_verified");
    expect(card.deskGuidance.publicDeskCanReadPayments).toBe(false);
    const body = buildStudioVoiceAnthropicBody({
      model: "test",
      facts: card,
      turns: [],
      question: "How can I pay?",
    });
    expect(JSON.stringify(body)).toContain("liveCheckoutOpen");
    expect(JSON.stringify(body)).not.toContain("sk_live");
  });

  it("answers the original sixteen questions with the model off", async () => {
    const pay = await ask(ORIGINAL[0]);
    expect(pay.say).toMatch(/live checkout is not open/i);
    expect(pay.say).not.toMatch(/visa|mastercard|paypal/i);
    expect(pay.guides.map((guide) => guide.href)).toEqual([STUDIO_VOICE_ROUTES.packages]);

    const cards = await ask(ORIGINAL[1]);
    expect(cards.say).toMatch(/not verified/i);
    expect(cards.say).not.toMatch(/\b(visa|mastercard|amex|discover|paypal)\b/i);

    const when = await ask(ORIGINAL[2]);
    expect(when.say).toMatch(/during checkout/i);
    expect(when.say).toMatch(/live checkout is not open/i);

    const failed = await ask(ORIGINAL[3]);
    expect(failed.say).toMatch(/not completed/i);
    expect(failed.say).toMatch(/no order was activated/i);
    expect(failed.say).toMatch(/still saved/i);
    expect(failed.say).not.toMatch(/payment succeeded|you are paid/i);

    const confirmed = await ask(ORIGINAL[4]);
    expect(confirmed.say).toMatch(/will not say a payment succeeded/i);
    expect(confirmed.say).toMatch(/my studio/i);
    expect(confirmed.guides.map((guide) => guide.href)).toEqual([STUDIO_VOICE_ROUTES.myStudio]);

    const where = await ask(ORIGINAL[5]);
    expect(where.say).toMatch(/live checkout is not open/i);
    expect(where.say).toMatch(/does not collect or store a card/i);
    expect(where.say).not.toMatch(/you enter your card on stripe/i);

    const offers = await ask(ORIGINAL[6]);
    expect(offers.say).toContain("$373.75");
    expect(offers.say).toContain("$279.20");
    expect(offers.say).toMatch(/four packages/i);

    const kit = await ask(ORIGINAL[7]);
    expect(kit.say).toContain("Campaign Launch Kit is $349");
    expect(kit.say).toContain("$279.20");
    expect(kit.say).toMatch(/flyer/i);

    const clip = await ask(ORIGINAL[8]);
    expect(clip.say).toContain("Clip Repurposing is $373.75");
    expect(clip.say).toContain("$299");

    const choose = await ask(ORIGINAL[9]);
    expect(choose.say).toMatch(/you still choose/i);
    expect(choose.say).toContain("$186.25");

    const next = await ask(ORIGINAL[10]);
    expect(next.say).toMatch(/live checkout is not open/i);
    expect(next.say).not.toMatch(/pay on stripe/i);
    expect(next.guides.map((guide) => guide.href)).toEqual([STUDIO_VOICE_ROUTES.packages]);

    const after = await ask(ORIGINAL[11]);
    expect(after.say).toMatch(/my studio after checkout/i);
    expect(after.say).toMatch(/moved into production/i);

    const refund = await ask(ORIGINAL[12]);
    expect(refund.escalation.kind).toBe("refund_unattached");
    expect(refund.say).toMatch(/will not grant or deny a refund/i);
    expect(refund.say).not.toMatch(/i have recorded/i);
    expect(refund.guides.map((guide) => guide.href)).toEqual([
      STUDIO_VOICE_ROUTES.email,
      STUDIO_VOICE_ROUTES.myStudio,
    ]);

    const complaint = await ask(ORIGINAL[13]);
    expect(complaint.escalation.kind).toBe("complaint_unattached");
    expect(complaint.say).toMatch(/complaint for the owner/i);
    expect(complaint.say).not.toMatch(/grant or deny a refund/i);
    expect(complaint.guides.map((guide) => guide.href)).toEqual([
      STUDIO_VOICE_ROUTES.email,
      STUDIO_VOICE_ROUTES.myStudio,
    ]);

    const mayor = await ask(ORIGINAL[14]);
    expect(mayor.say).toMatch(/outside what I can answer/i);
    expect(mayor.guides).toEqual([]);

    const contact = await ask(ORIGINAL[15]);
    expect(contact.say).toMatch(/email the studio/i);
    expect(contact.say).toMatch(/help center/i);
    expect(contact.say).not.toMatch(/@/);
    expect(contact.guides.map((guide) => guide.href)).toEqual([
      STUDIO_VOICE_ROUTES.email,
      STUDIO_VOICE_ROUTES.help,
    ]);

    for (const result of [pay, cards, when, failed, confirmed, where, contact]) {
      expect(result.say).not.toMatch(/outside what I can answer/i);
      for (const guide of result.guides) expect(isApprovedStudioVoiceGuide(guide)).toBe(true);
    }
  });

  it("covers checkout, tax, brands, and the three navigation questions", async () => {
    const closed = await ask("Is checkout disabled?");
    expect(closed.say).toMatch(/live checkout is not open/i);
    expect(closed.guides[0]?.href).toBe(STUDIO_VOICE_ROUTES.packages);

    const brands = await ask("Which card brands do you accept?");
    expect(brands.say).toMatch(/not verified/i);
    expect(brands.say).not.toMatch(/\bvisa\b/i);

    const tax = await ask("How much is the tax?");
    expect(tax.say).toMatch(/tax is not set up/i);
    expect(tax.say).not.toMatch(/\$\d/);

    const packages = await ask("Where can I see packages?");
    expect(packages.guides[0]?.href).toBe("/#packages");

    const started = await ask("How do I get started?");
    expect(started.say).toMatch(/does not charge you/i);
    expect(started.guides[0]?.href).toBe("/#packages");

    const studio = await ask("Where is My Studio?");
    expect(studio.guides[0]?.href).toBe("/studio-board");

    const help = await ask("Where can I get help?");
    expect(help.guides[0]?.href).toBe("/help-center?from=studio-lobby");

    const invented = { label: "Pay now", href: "https://evil.example/checkout" };
    expect(isApprovedStudioVoiceGuide(invented)).toBe(false);
  });

  it("replaces an outside-scope refusal for a trained Studio question", () => {
    const card = buildStudioVoiceFactsCard();
    const replaced = guidedAnswerInsteadOfRefusal(
      "How can I pay?",
      "That is outside what I can help with. I do not know that.",
      card,
    );
    expect(replaced).toMatch(/live checkout is not open/i);
    expect(
      guidedAnswerInsteadOfRefusal(
        "What is the mayor's favorite color?",
        "That is outside what I can answer from The Studio. I do not know that, and I will not guess.",
        card,
      ),
    ).toBeNull();
  });
});
