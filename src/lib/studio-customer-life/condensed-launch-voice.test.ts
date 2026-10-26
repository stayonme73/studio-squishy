import { describe, expect, it } from "vitest";

import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";

import { answerCustomerLifeQuestion } from "./answer-question";

describe("Studio Voice three-package door", () => {
  it("quotes the current packages and corrects the old shelf", () => {
    const offers = answerCustomerLifeQuestion("What packages do you offer?", {
      campaign: null,
    });
    expect(offers.text).toContain("$373.75");
    expect(offers.text).toContain("$186.25");
    expect(offers.text).toContain("$199");
    expect(offers.text).toContain("you pay $299");
    expect(offers.text).toContain("you pay $149");
    expect(offers.text).toContain("you pay $159.20");
    expect(offers.text).toContain("you pay $279.20");
    expect(offers.text).not.toMatch(/\$549|\$79/);

    expect(
      answerCustomerLifeQuestion("How much is Clip Repurposing?", { campaign: null }).text,
    ).toContain("Clip Repurposing is $373.75");
    expect(
      answerCustomerLifeQuestion("How much is Short-Form Video Editing?", { campaign: null }).text,
    ).toContain("Short-Form Video Editing is $186.25");
    expect(
      answerCustomerLifeQuestion("What is included in Short-Form Video Editing?", {
        campaign: null,
      }).text,
    ).toMatch(/English clips or marked moments/);
    expect(
      answerCustomerLifeQuestion("How much is Social & Promo Graphics?", { campaign: null }).text,
    ).toContain("Social & Promo Graphics is $199. With the 20% Studio Thank-You, you pay $159.20.");
    expect(
      answerCustomerLifeQuestion("How much is Campaign Launch Kit?", { campaign: null }).text,
    ).toContain("Campaign Launch Kit is $349. With the 20% Studio Thank-You, you pay $279.20.");
    expect(
      answerCustomerLifeQuestion("Isn't Short-Form $349?", { campaign: null }).text,
    ).toContain("not $349");
    expect(answerCustomerLifeQuestion("Is Clip $549?", { campaign: null }).text).toContain(
      "not $549",
    );
  });

  it("does not invent a delivery date, a password workflow, or an automatic refund", () => {
    const timing = answerCustomerLifeQuestion("Will it be done in three days?", {
      campaign: null,
    });
    expect(timing.text).toMatch(/does not promise a delivery date/i);
    expect(timing.text).not.toMatch(/\d+\s+business days/i);

    expect(
      answerCustomerLifeQuestion("Can I give you my Instagram password?", { campaign: null }).text,
    ).toMatch(/does not take passwords/i);
    expect(
      answerCustomerLifeQuestion("Can I get a refund automatically after 14 days?", {
        campaign: null,
      }).text,
    ).toMatch(/not automatic/i);
    expect(
      answerCustomerLifeQuestion("Do I upload before I pay?", { campaign: null }).text,
    ).toMatch(/My Studio after checkout/i);
    expect(
      answerCustomerLifeQuestion("Do I use the File Room?", { campaign: null }).text,
    ).toMatch(/do not use the staff File Room/i);
  });

  it("answers tested international checkout without calling it worldwide", () => {
    const canada = answerCustomerLifeQuestion("Can I buy from Canada?", {
      campaign: null,
    }).text;
    expect(canada).toMatch(/Canada billing country/);
    expect(canada).toMatch(/US dollars/);
    expect(canada).toMatch(/English recording/);
    expect(canada).toMatch(/will not call that worldwide/i);

    const uk = answerCustomerLifeQuestion("Can I buy from the UK?", {
      campaign: null,
    }).text;
    expect(uk).toMatch(/United Kingdom/);
    expect(uk).toMatch(/will not call that worldwide/i);

    const australia = answerCustomerLifeQuestion("Can I buy from Australia?", {
      campaign: null,
    }).text;
    expect(australia).toMatch(/Australia billing country/);

    const outside = answerCustomerLifeQuestion(
      "Do you serve customers outside the United States?",
      { campaign: null },
    ).text;
    expect(outside).toMatch(/Canada, the United Kingdom, Australia, and Germany/);
    expect(outside).toMatch(/will not say The Studio is worldwide/i);

    const currency = answerCustomerLifeQuestion("What currency do you charge?", {
      campaign: null,
    }).text;
    expect(currency).toMatch(/US dollars/);
    expect(currency).toMatch(/\$373\.75/);
    expect(currency).toMatch(/local-currency price was not shown/);

    const language = answerCustomerLifeQuestion("Do you work in other languages?", {
      campaign: null,
    }).text;
    expect(language).toMatch(/English source clips/);
    expect(language).toMatch(/do not offer the video packages in another language/i);
    expect(language).not.toMatch(/worldwide/i);
  });

  it("clarifies social posts as the current launch package", () => {
    const price = answerCustomerLifeQuestion("How much are social posts?", {
      campaign: null,
    });
    expect(price.text).toContain("Social & Promo Graphics");
    expect(price.text).toContain("$199");
    expect(price.text).toContain("you pay $159.20");
    expect(price.text).not.toMatch(/\$99/);
  });

  it("does not keep an estimated delivery timeline on the Studio Plan sentence", () => {
    expect(conversationRoomGuideV1.studioPlanVoiceOrient).toMatch(
      /does not promise a delivery date/i,
    );
    expect(conversationRoomGuideV1.studioPlanVoiceOrient).not.toMatch(/timeline/i);
    expect(conversationRoomGuideV1.studioPlanTimelineLabel).toBe("When production can begin");
    expect(conversationRoomGuideV1.studioPlanTimelineAsteriskNote).toMatch(
      /does not promise a start date or a delivery date/i,
    );
  });
});
