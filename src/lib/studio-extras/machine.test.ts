import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import {
  ensureStudioExtrasMaterialSlots,
  isStudioExtraMaterialItem,
  missingStudioExtraInputs,
  studioExtraInputValues,
} from "./inputs";
import {
  approveStudioExtra,
  deliverStudioExtra,
  evaluateStudioExtrasCourtesy,
  initialStudioExtrasTruth,
  recordStudioExtraAttempt,
  recordStudioExtraQuality,
  refreshStudioExtrasInputs,
  requestStudioExtraRevision,
  withStudioExtrasCourtesy,
} from "./machine";
import { canAddStudioExtra, validateStudioExtrasSelection } from "./selection";
import type { CampaignStudioExtras } from "./types";
import { countBlockingRequiredMaterials } from "@/lib/materials/materials-view";

const AT = "2026-10-10T15:00:00.000Z";

function paid(amount: number): Pick<CampaignRecord, "paymentTruth"> {
  return {
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: amount,
      confirmedAmountCents: amount,
      selectedServiceIds: [],
      decisionId: "d",
      factFingerprint: "f",
      draftRevision: 1,
    },
  };
}

function exhaustDesign(truth: CampaignStudioExtras, id: "flyer" | "menu_price_list", unitId: string) {
  let next = truth;
  for (let i = 0; i < 3; i += 1) {
    next = recordStudioExtraAttempt(next, id, unitId, { route: "primary", at: AT, outcome: "failed", reasons: ["QA: text overflow"] });
  }
  next = recordStudioExtraAttempt(next, id, unitId, { route: "recovery", at: AT, outcome: "failed", reasons: ["QA: contrast"] });
  return recordStudioExtraQuality(next, id, unitId, { at: AT, outcome: "below_standard", summary: "Text cannot fit legibly." });
}

describe("Studio Extras selection", () => {
  it("accepts 0, 1, or 2 eligible Extras and Skip", () => {
    expect(validateStudioExtrasSelection("clip_repurposing", undefined)).toEqual({ ok: true, extras: [] });
    expect(validateStudioExtrasSelection("clip_repurposing", [])).toEqual({ ok: true, extras: [] });
    expect(validateStudioExtrasSelection("clip_repurposing", ["flyer"]).ok).toBe(true);
    expect(validateStudioExtrasSelection("short_form_video_editing", ["ad_creative", "email_and_text"]).ok).toBe(true);
    expect(validateStudioExtrasSelection("social_and_promo_graphics", ["menu_price_list", "review_request_kit"]).ok).toBe(true);
  });

  it("blocks a third selection", () => {
    const result = validateStudioExtrasSelection("clip_repurposing", ["flyer", "ad_creative", "email_and_text"]);
    expect(result).toMatchObject({ ok: false, code: "EXTRAS_OVER_LIMIT" });
    expect(canAddStudioExtra("clip_repurposing", ["flyer", "ad_creative"], "email_and_text")).toBe(false);
    expect(canAddStudioExtra("clip_repurposing", ["flyer"], "ad_creative")).toBe(true);
  });

  it("blocks invalid package pairings, unknown, duplicate, and removed Extras", () => {
    expect(validateStudioExtrasSelection("social_and_promo_graphics", ["ad_creative"])).toMatchObject({ ok: false, code: "EXTRA_NOT_ELIGIBLE_FOR_PACKAGE" });
    expect(validateStudioExtrasSelection("clip_repurposing", ["menu_price_list"])).toMatchObject({ ok: false, code: "EXTRA_NOT_ELIGIBLE_FOR_PACKAGE" });
    expect(validateStudioExtrasSelection("clip_repurposing", ["ai_local_visibility"])).toMatchObject({ ok: false, code: "EXTRA_UNKNOWN" });
    expect(validateStudioExtrasSelection("clip_repurposing", ["flyer", "flyer"])).toMatchObject({ ok: false, code: "EXTRA_DUPLICATE" });
    expect(validateStudioExtrasSelection("clip_repurposing", "flyer")).toMatchObject({ ok: false, code: "EXTRAS_NOT_A_LIST" });
  });
});

function clipCampaign(extras: CampaignRecord["condensedOffer"] extends infer O ? (O extends { extras?: infer E } ? E : never) : never, answers: Record<string, string> = {}): CampaignRecord {
  return {
    campaignId: "c-1",
    condensedOffer: {
      packageId: "clip_repurposing",
      name: "Clip Repurposing",
      priceCents: 39900,
      revisionRounds: 3,
      customerName: "Ana",
      customerEmail: "a@example.com",
      company: "Ana's Bakery",
      projectNeed: "",
      materialsNote: "",
      support: {},
      extras,
    },
    routeMapIntakeDraft: { answers, savedAt: AT },
  } as unknown as CampaignRecord;
}

describe("Studio Extras inputs and Waiting on Client", () => {
  it("reuses package facts and asks only for what an Extra adds", () => {
    const campaign = clipCampaign(["flyer", "review_request_kit"], {
      "clip_repurposing:purpose": "Fall pie preorders open October 15.",
      "clip_repurposing:cta": "Order at anasbakery.com",
    });
    const seeded = ensureStudioExtrasMaterialSlots({ campaignId: "c-1", items: [], updatedAt: AT, version: 1 }, campaign);
    const ids = seeded.record.items.map((item) => item.id).sort();
    expect(ids).toEqual(["studio-extra-logo", "studio-extra-review-link", "studio-extra-text-consent"]);
    expect(seeded.record.items.every(isStudioExtraMaterialItem)).toBe(true);
    expect(countBlockingRequiredMaterials(seeded.record.items)).toBe(0);
    const again = ensureStudioExtrasMaterialSlots(seeded.record, campaign);
    expect(again.changed).toBe(false);
  });

  it("missing input = Waiting on Client; supplying it moves to ready", () => {
    const campaign = clipCampaign(["review_request_kit"]);
    let truth = initialStudioExtrasTruth("clip_repurposing", ["review_request_kit"], AT);
    truth = refreshStudioExtrasInputs(truth, studioExtraInputValues(campaign, []), AT);
    expect(truth.records[0]?.state).toBe("waiting_on_client");
    expect(truth.records[0]?.missingInputs).toEqual(["review_link", "text_consent"]);

    const items: CampaignMaterialItem[] = [
      { id: "studio-extra-review-link", contentKind: "url", url: "https://g.page/r/abc/review", reviewStatus: "submitted" } as CampaignMaterialItem,
      { id: "studio-extra-text-consent", contentKind: "confirmation", confirmedAt: AT, reviewStatus: "submitted" } as CampaignMaterialItem,
    ];
    truth = refreshStudioExtrasInputs(truth, studioExtraInputValues(campaign, items), AT);
    expect(truth.records[0]?.state).toBe("ready_for_production");
    expect(truth.records[0]?.history.map((h) => h.event)).toEqual(["selected", "inputs_complete"]);
  });

  it("rejects a review link that is not a link and requires contact only for price lists", () => {
    expect(missingStudioExtraInputs("review_request_kit", { review_link: "google", text_consent: "yes" })).toEqual(["review_link"]);
    expect(missingStudioExtraInputs("menu_price_list", { menu_kind: "menu", menu_items: "Mains | Pie | Apple | $12" })).toEqual(["menu_notes", "logo"]);
    expect(missingStudioExtraInputs("menu_price_list", { menu_kind: "menu", menu_items: "Mains | Pie | Apple | $12", menu_notes: "Ask about allergies.", logo: "logo.png" })).toEqual([]);
    expect(missingStudioExtraInputs("menu_price_list", { menu_kind: "price list", menu_items: "Cut | Trim | $30", menu_notes: "Prices may change.", logo: "logo.png" })).toEqual(["contact"]);
  });

  it("a price-list answer routes to the service-sheet line before production starts", () => {
    let truth = initialStudioExtrasTruth("social_and_promo_graphics", ["menu_price_list"], AT);
    expect(truth.records[0]?.units[0]?.productionLine).toBe("v2-rtu-menu");
    truth = refreshStudioExtrasInputs(truth, { menu_kind: "price list", menu_items: "Cut | $30", contact: "555-123-4567", menu_notes: "Prices may change.", logo: "logo.png" }, AT);
    expect(truth.records[0]?.units[0]?.productionLine).toBe("v2-rtu-service-sheet");
  });
});

describe("Studio Extras exhaustion and Courtesy Adjustment", () => {
  function ready(extras: ("flyer" | "menu_price_list" | "email_and_text")[]) {
    let truth = initialStudioExtrasTruth("social_and_promo_graphics", extras, AT);
    truth = refreshStudioExtrasInputs(
      truth,
      { offer: "Fall sale", cta: "Call 555-123-4567", contact: "555-123-4567", menu_kind: "menu", menu_items: "Pie | $12", menu_notes: "Ask about allergies.", logo: "logo.png", text_consent: "yes" },
      AT,
    );
    return truth;
  }

  it("a weak first attempt or a failed attempt within budget is not exhaustion", () => {
    let truth = ready(["flyer"]);
    truth = recordStudioExtraAttempt(truth, "flyer", "flyer", { route: "primary", at: AT, outcome: "failed", reasons: ["weak"] });
    truth = recordStudioExtraQuality(truth, "flyer", "flyer", { at: AT, outcome: "below_standard", summary: "weak first attempt" });
    expect(truth.records[0]?.state).not.toBe("exhausted");
    expect(evaluateStudioExtrasCourtesy(truth, paid(15920), AT).status).toBe("not_eligible");
  });

  it("design exhaustion needs 3 attempts, the recovery attempt, and Quality", () => {
    let truth = ready(["flyer"]);
    for (let i = 0; i < 3; i += 1) {
      truth = recordStudioExtraAttempt(truth, "flyer", "flyer", { route: "primary", at: AT, outcome: "failed", reasons: ["x"] });
    }
    truth = recordStudioExtraQuality(truth, "flyer", "flyer", { at: AT, outcome: "below_standard", summary: "s" });
    expect(truth.records[0]?.state).not.toBe("exhausted");
    truth = exhaustDesign(ready(["flyer"]), "flyer", "flyer");
    expect(truth.records[0]?.state).toBe("exhausted");
    expect(truth.records[0]?.exhaustion).toMatchObject({ attemptsUsed: 4, attemptBudget: 3, recoveryAttempted: true });
  });

  it("refuses attempts past the budget", () => {
    let truth = ready(["flyer"]);
    for (let i = 0; i < 5; i += 1) {
      truth = recordStudioExtraAttempt(truth, "flyer", "flyer", { route: "primary", at: AT, outcome: "failed", reasons: [] });
    }
    expect(truth.records[0]?.units[0]?.attempts).toHaveLength(3);
  });

  it("copy exhaustion: 2 attempts, no template recovery, then Quality", () => {
    let truth = ready(["email_and_text"]);
    truth = recordStudioExtraAttempt(truth, "email_and_text", "email", { route: "primary", at: AT, outcome: "failed", reasons: ["QA"] });
    truth = recordStudioExtraAttempt(truth, "email_and_text", "email", { route: "primary", at: AT, outcome: "failed", reasons: ["QA"] });
    truth = recordStudioExtraQuality(truth, "email_and_text", "email", { at: AT, outcome: "below_standard", summary: "Claims could not be kept factual." });
    expect(truth.records[0]?.state).toBe("exhausted");
    expect(truth.records[0]?.exhaustion?.recoveryAvailable).toBe(false);
  });

  it("missing input never becomes exhaustion or Courtesy", () => {
    let truth = initialStudioExtrasTruth("social_and_promo_graphics", ["flyer"], AT);
    truth = refreshStudioExtrasInputs(truth, {}, AT);
    truth = exhaustDesign(truth, "flyer", "flyer");
    expect(truth.records[0]?.state).toBe("waiting_on_client");
    expect(evaluateStudioExtrasCourtesy(truth, paid(15920), AT)).toMatchObject({ status: "not_eligible", dueCents: 0 });
  });

  it("one exhausted Extra = 5% of the amount paid; two = 10%; Thank-You stays separate", () => {
    let one = exhaustDesign(ready(["flyer", "menu_price_list"]), "flyer", "flyer");
    const c1 = evaluateStudioExtrasCourtesy(one, paid(15920), AT);
    expect(c1).toMatchObject({ status: "COURTESY_ADJUSTMENT_REQUIRED", percent: 5, amountPaidCents: 15920, dueCents: 796, paymentExecution: "not_started" });
    expect(Object.values(c1.proof).every(Boolean)).toBe(true);
    one = exhaustDesign(one, "menu_price_list", "menu");
    const c2 = evaluateStudioExtrasCourtesy(one, paid(15920), AT);
    expect(c2).toMatchObject({ percent: 10, totalAdjustmentCents: 1592, dueCents: 1592 });
    expect(c2.ownerNotice).toContain("two Studio Extras");
  });

  it("is computed from the confirmed amount paid, never the list price, and not without payment", () => {
    const truth = exhaustDesign(ready(["flyer"]), "flyer", "flyer");
    expect(evaluateStudioExtrasCourtesy(truth, paid(29900), AT).dueCents).toBe(1495);
    expect(evaluateStudioExtrasCourtesy(truth, {}, AT)).toMatchObject({ status: "not_eligible", dueCents: 0 });
  });

  it("does not double-issue: an issued adjustment only owes the difference", () => {
    const truth = exhaustDesign(ready(["flyer"]), "flyer", "flyer");
    const issued: CampaignStudioExtras = {
      ...truth,
      courtesy: { ...evaluateStudioExtrasCourtesy(truth, paid(15920), AT), status: "issued", paymentExecution: "completed" },
    };
    const again = evaluateStudioExtrasCourtesy(issued, paid(15920), AT);
    expect(again).toMatchObject({ status: "issued", dueCents: 0 });
    expect(withStudioExtrasCourtesy(truth, paid(15920), AT).courtesy?.status).toBe("COURTESY_ADJUSTMENT_REQUIRED");
  });
});

describe("Studio Extras review, revision, delivery", () => {
  it("passes Quality to Review, shares the package revision round, then approves and delivers", () => {
    let truth = initialStudioExtrasTruth("clip_repurposing", ["flyer"], AT);
    truth = refreshStudioExtrasInputs(truth, { offer: "o", cta: "c", contact: "555-123-4567" }, AT);
    truth = recordStudioExtraAttempt(truth, "flyer", "flyer", { route: "primary", at: AT, outcome: "passed", reasons: [] });
    truth = recordStudioExtraQuality(truth, "flyer", "flyer", { at: AT, outcome: "passed", summary: "ok", artifacts: [{ path: "a.png", label: "Flyer", mimeType: "image/png" }] });
    expect(truth.records[0]?.state).toBe("ready_for_review");
    truth = requestStudioExtraRevision(truth, "flyer", { at: AT, note: "Make the date bigger", packageRound: 1 });
    expect(truth.records[0]).toMatchObject({ state: "revision_requested", lastRevisionRound: 1 });
    expect(truth.records[0]?.units[0]?.attempts).toHaveLength(0);
    truth = recordStudioExtraAttempt(truth, "flyer", "flyer", { route: "primary", at: AT, outcome: "passed", reasons: [] });
    truth = recordStudioExtraQuality(truth, "flyer", "flyer", { at: AT, outcome: "passed", summary: "ok", artifacts: [] });
    truth = approveStudioExtra(truth, "flyer", AT);
    truth = deliverStudioExtra(truth, "flyer", AT);
    expect(truth.records[0]?.state).toBe("delivered");
    expect(truth.records[0]?.history.map((h) => h.event)).toContain("revision_requested");
  });
});
