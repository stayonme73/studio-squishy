import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioPolicies } from "@/config/policies";
import {
  CONDENSED_PACKAGE_IDS,
  supportOptionsForPackage,
} from "@/config/studio-customer-journey-condense-v1";
import {
  STUDIO_EXTRA_IDS,
  studioExtrasCustomerCopy,
  studioExtrasEligibilityByPackage,
  studioExtrasExplainer,
  studioExtrasV1,
  type StudioExtraId,
} from "@/config/studio-extras-v1";
import { deriveCorrectionAccounting } from "@/lib/job-control/correction-round-ledger";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  chooseStudioExtra,
  emptyCondensedJourneyDraft,
  selectedStudioExtras,
  skipAllStudioExtras,
} from "@/lib/studio-customer-journey-condense/draft";
import { answerCondensedLaunchVoice } from "@/lib/studio-customer-life/condensed-launch-voice";
import {
  buildCondensedCheckoutCampaign,
  condensedOfferExtras,
  condensedOfferFromRequest,
} from "@/lib/studio-payment/condensed-offer";

import { mergeStudioExtrasAfterProduction } from "./advance";
import {
  resolveStudioExtrasCustomerView,
  studioExtraArtifactAllowed,
} from "./customer-view";
import { ensureStudioExtrasMaterialSlots } from "./inputs";
import {
  approveAndDeliverReadyStudioExtras,
  evaluateStudioExtrasCourtesy,
  initialStudioExtrasTruth,
  requestStudioExtrasChanges,
  settleStudioExtrasRevisionRounds,
} from "./machine";
import { runStudioExtrasProduction, studioExtraUnitAdapters, type UnitAdapter } from "./production";
import { validateStudioExtrasSelection } from "./selection";
import type { CampaignStudioExtras } from "./types";

const AT = "2026-10-10T15:00:00.000Z";
const CID = "extras-scenario";
const repoRoot = mkdtempSync(path.join(tmpdir(), "studio-extras-"));
afterAll(() => rmSync(repoRoot, { recursive: true, force: true }));

const FLYER_FACTS = {
  "clip_repurposing:purpose": "Fall pie preorders open October 15.",
  "clip_repurposing:cta": "Order at anasbakery.com or call 555-123-4567",
};

function campaign(
  packageId: CampaignRecord["condensedOffer"] extends infer O ? (O extends { packageId: infer P } ? P : never) : never,
  extras: StudioExtraId[],
  overrides: Partial<CampaignRecord> = {},
): CampaignRecord {
  return {
    campaignId: CID,
    campaignName: "Ana's Bakery",
    revisionRoundsIncluded: 3,
    revisionRoundsIncludedSource: "package_snapshot",
    condensedOffer: {
      packageId,
      name: "Package",
      priceCents: 37375,
      revisionRounds: 3,
      customerName: "Ana",
      customerEmail: "a@example.com",
      company: "Ana's Bakery",
      projectNeed: "",
      materialsNote: "",
      support: {},
      extras,
    },
    routeMapIntakeDraft: { answers: FLYER_FACTS, savedAt: AT },
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 29900,
      confirmedAmountCents: 29900,
      selectedServiceIds: [],
      decisionId: "d",
      factFingerprint: "f",
      draftRevision: 1,
    },
    studioExtras: initialStudioExtrasTruth(packageId, extras, AT),
    ...overrides,
  } as unknown as CampaignRecord;
}

/** Writes a real proof file inside the campaign artifact folder, like the reused lines do. */
function passingAdapter(calls: string[] = []): UnitAdapter {
  return async (ctx) => {
    calls.push(`${ctx.extraId}:${ctx.unit.unitId}:${ctx.route}`);
    const rel = `data/campaign-design-artifacts/${CID}/studio-extras/${ctx.extraId}/${ctx.unit.unitId}/proof.txt`;
    mkdirSync(path.dirname(path.join(repoRoot, rel)), { recursive: true });
    writeFileSync(path.join(repoRoot, rel), `Studio-written ${ctx.unit.label}${ctx.revisionNote ? ` — ${ctx.revisionNote}` : ""}`);
    return {
      ok: true,
      attempts: [{ outcome: "passed", reasons: [] }],
      artifacts: [{ path: rel, label: ctx.unit.label, mimeType: "text/plain" }],
      qualitySummary: "Passed Studio QA.",
    };
  };
}

function failingAdapter(calls: string[] = []): UnitAdapter {
  return async (ctx) => {
    calls.push(`${ctx.extraId}:${ctx.unit.unitId}:${ctx.route}`);
    const n = ctx.route === "recovery" ? 1 : ctx.remainingBudget;
    return {
      ok: false,
      attempts: Array.from({ length: n }, () => ({ outcome: "failed" as const, reasons: ["QA: text overflow"] })),
      artifacts: [],
      qualitySummary: "Text cannot fit legibly.",
    };
  };
}

function every(adapter: UnitAdapter): Record<string, UnitAdapter> {
  return Object.fromEntries(Object.keys(studioExtraUnitAdapters).map((key) => [key, adapter]));
}

const ENVELOPE = { jobCorrectionUses: [], jobCorrectionExtraGrants: [], jobActivityEvents: [], jobRecords: [] };

function accounting(c: CampaignRecord) {
  return deriveCorrectionAccounting({ campaign: c, envelope: ENVELOPE as never });
}

async function produce(c: CampaignRecord, adapter: UnitAdapter, materials: CampaignMaterialItem[] = []) {
  const run = await runStudioExtrasProduction({ repoRoot, campaign: c, materials, adapters: every(adapter) });
  return { ...c, studioExtras: run.truth ?? undefined } as CampaignRecord;
}

describe("Studio Extras V1 — 25 scenarios", () => {
  it("1. Clip and Short-Form offer exactly Review Request Kit, Email + Text, Ad Creative, Flyer", () => {
    for (const pkg of ["clip_repurposing", "short_form_video_editing"] as const) {
      expect(supportOptionsForPackage(pkg).map((o) => o.label)).toEqual([
        "Review Request Kit",
        "Email + Text",
        "Ad Creative",
        "Flyer",
      ]);
    }
  });

  it("2. Social offers Review Request Kit, Email + Text, Flyer, Menu / Price List — never Ad Creative", () => {
    expect(supportOptionsForPackage("social_and_promo_graphics").map((o) => o.label)).toEqual([
      "Review Request Kit",
      "Email + Text",
      "Flyer",
      "Menu / Price List",
    ]);
    expect(validateStudioExtrasSelection("social_and_promo_graphics", ["ad_creative"])).toMatchObject({
      ok: false,
      code: "EXTRA_NOT_ELIGIBLE_FOR_PACKAGE",
    });
  });

  it("3. Local AI Visibility is gone from config, builder, checkout, and Voice", () => {
    expect(STUDIO_EXTRA_IDS).not.toContain("ai_local_visibility" as never);
    for (const pkg of CONDENSED_PACKAGE_IDS) {
      expect(supportOptionsForPackage(pkg).map((o) => o.id)).not.toContain("ai_local_visibility");
    }
    expect(validateStudioExtrasSelection("social_and_promo_graphics", ["ai_local_visibility"])).toMatchObject({ ok: false });
    expect(answerCondensedLaunchVoice("Can I add AI and local visibility?")).toContain("not offered right now");
  });

  it("4. Skip: zero Extras is a complete choice and seeds no Extras work", () => {
    const skipped = skipAllStudioExtras(emptyCondensedJourneyDraft("clip_repurposing"));
    expect(selectedStudioExtras(skipped)).toEqual([]);
    expect(validateStudioExtrasSelection("clip_repurposing", [])).toEqual({ ok: true, extras: [] });
    const request = { condensedOffer: { packageId: "clip_repurposing" }, facts: { selectedServiceIds: [] } } as never;
    const offer = condensedOfferFromRequest(request)!;
    const built = buildCondensedCheckoutCampaign({ campaignId: CID, existing: null, offer, facts: { projectNeed: "x", businessName: "Ana", existingMaterialsNote: "" } as never, request });
    expect(built.studioExtras).toBeUndefined();
  });

  it("5. Builder: two is the maximum; the third Add is refused and the rest stay unselected", () => {
    let draft = emptyCondensedJourneyDraft("clip_repurposing");
    draft = chooseStudioExtra(draft, "flyer", "SELECT");
    expect(selectedStudioExtras(draft)).toEqual(["flyer"]);
    draft = chooseStudioExtra(draft, "ad_creative", "SELECT");
    expect(selectedStudioExtras(draft)).toEqual(["ad_creative", "flyer"]);
    expect(draft.support.review_request_kit).toBe("");
    expect(draft.support.email_and_text).toBe("");
    const third = chooseStudioExtra(draft, "email_and_text", "SELECT");
    expect(selectedStudioExtras(third)).toEqual(["ad_creative", "flyer"]);
    expect(third.support.email_and_text).toBe("");
    expect(chooseStudioExtra(draft, "menu_price_list", "SELECT")).toBe(draft);
  });

  it("6. Server refuses a third Extra, an invalid pairing, an unknown id, and duplicates", () => {
    expect(validateStudioExtrasSelection("clip_repurposing", ["flyer", "ad_creative", "email_and_text"])).toMatchObject({ ok: false, code: "EXTRAS_OVER_LIMIT" });
    expect(validateStudioExtrasSelection("clip_repurposing", ["menu_price_list"])).toMatchObject({ ok: false });
    expect(validateStudioExtrasSelection("clip_repurposing", ["flyer", "flyer"])).toMatchObject({ ok: false });
    const bad = { condensedOffer: { packageId: "social_and_promo_graphics", extras: ["ad_creative"] }, facts: { selectedServiceIds: [] } } as never;
    expect(condensedOfferExtras("social_and_promo_graphics", bad)).toEqual([]);
  });

  it("7. Checkout seeds Machine truth for each selected Extra and the price does not change", () => {
    const base = { condensedOffer: { packageId: "clip_repurposing" }, facts: { selectedServiceIds: [] } };
    const withExtras = { ...base, condensedOffer: { ...base.condensedOffer, extras: ["flyer", "review_request_kit"] } } as never;
    const facts = { projectNeed: "x", businessName: "Ana", existingMaterialsNote: "" } as never;
    const offer = condensedOfferFromRequest(withExtras)!;
    const plain = buildCondensedCheckoutCampaign({ campaignId: CID, existing: null, offer, facts, request: base as never });
    const built = buildCondensedCheckoutCampaign({ campaignId: CID, existing: null, offer, facts, request: withExtras });
    expect(built.studioExtras?.selected).toEqual(["flyer", "review_request_kit"]);
    expect(built.studioExtras?.records.map((r) => r.state)).toEqual(["waiting_on_client", "waiting_on_client"]);
    expect(built.condensedOffer?.amountDueCents).toBe(plain.condensedOffer?.amountDueCents);
    expect(built.condensedOffer?.priceCents).toBe(plain.condensedOffer?.priceCents);
    expect(built.condensedOffer?.thankYouDiscountCents).toBe(plain.condensedOffer?.thankYouDiscountCents);
  });

  it("8. Extra-specific intake asks only for what the Extra adds to the package facts", () => {
    const c = campaign("clip_repurposing", ["ad_creative", "review_request_kit"]);
    const seeded = ensureStudioExtrasMaterialSlots({ campaignId: CID, items: [], updatedAt: AT, version: 1 }, c);
    const ids = seeded.record.items.map((i) => i.id).sort();
    expect(ids).toEqual(["studio-extra-logo", "studio-extra-review-link", "studio-extra-text-consent"]);
    expect(seeded.record.items.find((i) => i.id === "studio-extra-review-link")?.clientFacingPrompt).toContain("Review Request Kit");
  });

  it("9. Missing input = Waiting on Client: no production attempt, no exhaustion, no courtesy", async () => {
    const calls: string[] = [];
    const c = await produce(campaign("clip_repurposing", ["review_request_kit"]), failingAdapter(calls));
    const record = c.studioExtras!.records[0]!;
    expect(record.state).toBe("waiting_on_client");
    expect(calls).toEqual([]);
    expect(c.studioExtras!.courtesy?.status ?? "not_eligible").toBe("not_eligible");
    const view = await resolveStudioExtrasCustomerView(c, repoRoot);
    expect(view!.extras[0]!.statusLine).toContain("Waiting on you");
    expect(view!.extras[0]!.waitingOn.map((w) => w.label)).toEqual(["Your review link", "Permission to text your customers"]);
    expect(view!.courtesy).toBeNull();
  });

  it("10. Supplied inputs → real work units on existing lines → Quality → Ready for review", async () => {
    const calls: string[] = [];
    const c = await produce(campaign("clip_repurposing", ["flyer", "ad_creative"]), passingAdapter(calls));
    expect(calls).toEqual(["flyer:flyer:primary", "ad_creative:ad-copy:primary", "ad_creative:ad-graphics:primary"]);
    for (const record of c.studioExtras!.records) {
      expect(record.state).toBe("ready_for_review");
      const events = record.history.map((h) => h.event);
      expect(events).toEqual(expect.arrayContaining(["selected", "inputs_complete", "production_started", "quality_review", "ready_for_review"]));
    }
    const ad = c.studioExtras!.records.find((r) => r.id === "ad_creative")!;
    expect(ad.units.map((u) => u.productionLine)).toEqual(["studio-extras-copy", "v2-rtu-promotion-graphics"]);
  });

  it("11. Review Request Kit and Ad Creative copy route to the Studio writer, not a template", () => {
    expect(studioExtrasV1).toBeTruthy();
    const kit = initialStudioExtrasTruth("clip_repurposing", ["review_request_kit", "ad_creative"], AT);
    expect(kit.records[0]!.units[0]).toMatchObject({ kind: "copy", productionLine: "studio-extras-copy", budget: 2 });
    expect(kit.records[0]!.units[0]!.recovery.available).toBe(false);
    expect(kit.records[1]!.units[0]).toMatchObject({ kind: "copy", productionLine: "studio-extras-copy", budget: 2 });
    expect(studioExtraUnitAdapters["review_request_kit:review-messages"]).toBeTypeOf("function");
    expect(studioExtraUnitAdapters["ad_creative:ad-copy"]).toBeTypeOf("function");
  });

  it("12. Writer down = Waiting on System, then resumes on the next run without spending attempts", async () => {
    const down: UnitAdapter = async () => ({ ok: false, attempts: [], artifacts: [], waitingOnSystem: "Studio writer unavailable.", qualitySummary: "" });
    const c = campaign("clip_repurposing", ["flyer"]);
    const waiting = await produce(c, down);
    expect(waiting.studioExtras!.records[0]!.state).toBe("waiting_on_system");
    expect(waiting.studioExtras!.records[0]!.units[0]!.attempts).toHaveLength(0);
    const resumed = await produce(waiting, passingAdapter());
    expect(resumed.studioExtras!.records[0]!.state).toBe("ready_for_review");
  });

  it("13. Design exhaustion: 3 attempts, then the approved recovery, then Quality", async () => {
    const calls: string[] = [];
    const c = await produce(campaign("clip_repurposing", ["flyer"]), failingAdapter(calls));
    const record = c.studioExtras!.records[0]!;
    expect(calls).toEqual(["flyer:flyer:primary", "flyer:flyer:recovery"]);
    expect(record.state).toBe("exhausted");
    expect(record.units[0]!.attempts.map((a) => a.route)).toEqual(["primary", "primary", "primary", "recovery"]);
    expect(record.exhaustion).toMatchObject({ attemptBudget: 3, recoveryAvailable: true, recoveryAttempted: true, customerSuppliedRequiredInputs: true });
    expect(record.history.map((h) => h.event)).toContain("exhausted");
  });

  it("14. Copy exhaustion: 2 attempts, no template recovery, then Quality", async () => {
    const c = await produce(campaign("clip_repurposing", ["ad_creative"]), failingAdapter());
    const record = c.studioExtras!.records[0]!;
    expect(record.state).toBe("exhausted");
    expect(record.units[0]!.attempts).toHaveLength(2);
    expect(record.exhaustion?.recoveryAvailable).toBe(false);
    expect(record.units[1]!.attempts).toHaveLength(0);
  });

  it("15. One exhausted Extra = 5% of the amount actually paid; payment stops at COURTESY ADJUSTMENT REQUIRED", async () => {
    const c = await produce(campaign("clip_repurposing", ["flyer"]), failingAdapter());
    expect(c.studioExtras!.courtesy).toMatchObject({
      status: "COURTESY_ADJUSTMENT_REQUIRED",
      percent: 5,
      amountPaidCents: 29900,
      dueCents: 1495,
      paymentExecution: "not_started",
    });
    const view = await resolveStudioExtrasCustomerView(c, repoRoot);
    expect(view!.courtesy!.message).toBe(
      "A 5% Courtesy Adjustment of $14.95 applies to the amount you paid. It has not been returned to your card.",
    );
  });

  it("16. Two exhausted = 10% of the amount paid; the 20% Studio Thank-You is untouched and separate", async () => {
    const c = await produce(campaign("clip_repurposing", ["flyer", "ad_creative"]), failingAdapter());
    expect(c.studioExtras!.courtesy).toMatchObject({ percent: 10, totalAdjustmentCents: 2990 });
    const offer = condensedOfferFromRequest({ condensedOffer: { packageId: "clip_repurposing" }, facts: { selectedServiceIds: [] } } as never)!;
    expect(offer.chargeCents).toBe(29900);
    expect(offer.listPriceCents - offer.chargeCents).toBe(offer.thankYouDiscountCents);
    expect(offer.thankYouDiscountCents).toBe(7475);
    expect(studioExtrasExplainer().promise).toContain("separate from the Studio Thank-You");
  });

  it("17. No double issue: an issued adjustment owes nothing more", async () => {
    const c = await produce(campaign("clip_repurposing", ["flyer"]), failingAdapter());
    const issued: CampaignStudioExtras = { ...c.studioExtras!, courtesy: { ...c.studioExtras!.courtesy!, status: "issued", paymentExecution: "completed" } };
    expect(evaluateStudioExtrasCourtesy(issued, c, AT)).toMatchObject({ status: "issued", dueCents: 0 });
  });

  it("18. An exhausted Extra never silently disappears: it stays on the record, the customer is told, and delivery shows it", async () => {
    const c = await produce(campaign("clip_repurposing", ["flyer", "ad_creative"]), async (ctx) =>
      ctx.extraId === "flyer" ? failingAdapter()(ctx) : passingAdapter()(ctx),
    );
    expect(c.studioExtras!.records.map((r) => r.id)).toEqual(["flyer", "ad_creative"]);
    const view = await resolveStudioExtrasCustomerView(c, repoRoot);
    const flyer = view!.extras.find((e) => e.id === "flyer")!;
    expect(flyer.statusLine).toBe("The Studio could not complete this Extra to Studio quality, so it will not be sent. A Courtesy Adjustment applies.");
    expect(flyer.files).toEqual([]);
    expect(flyer.canApprove).toBe(false);
  });

  it("19. Review: proof files are inline-readable copy and hrefs are proof-purpose until delivery", async () => {
    const c = await produce(campaign("clip_repurposing", ["flyer"]), passingAdapter());
    const view = await resolveStudioExtrasCustomerView(c, repoRoot);
    const file = view!.extras[0]!.files[0]!;
    expect(file.href).toBe(`/api/campaigns/${CID}/studio-extras/files/flyer/flyer/0?purpose=proof`);
    expect(file.text).toContain("Studio-written Single-page flyer");
    expect(view!.extras[0]).toMatchObject({ canApprove: true, canRequestChange: true });
  });

  it("20. Extras-only change spends one shared round: reserved while pending, counted when back in Review", async () => {
    const ready = await produce(campaign("clip_repurposing", ["flyer"]), passingAdapter());
    expect(accounting(ready)).toMatchObject({ used: 0, remainingIncluded: 3 });
    const changed = requestStudioExtrasChanges(ready.studioExtras!, [{ id: "flyer", note: "Make the date bigger." }], { at: AT, packageRound: 1, ridesPackageRevision: false });
    expect(changed.ok).toBe(true);
    const pending = { ...ready, studioExtras: changed.ok ? changed.truth : undefined } as CampaignRecord;
    expect(accounting(pending)).toMatchObject({ used: 0, remainingIncluded: 2 });
    const back = await produce(pending, passingAdapter());
    expect(back.studioExtras!.records[0]!.state).toBe("ready_for_review");
    expect(back.studioExtras!.revisionRounds![0]!.reachedReviewAt).not.toBeNull();
    expect(accounting(back)).toMatchObject({ used: 1, remainingIncluded: 2 });
    const view = await resolveStudioExtrasCustomerView(back, repoRoot);
    expect(view!.extras[0]!.files[0]!.text).toContain("Make the date bigger.");
  });

  it("21. A round whose Extra exhausts is voided and the allowance is restored", async () => {
    const ready = await produce(campaign("clip_repurposing", ["flyer"]), passingAdapter());
    const changed = requestStudioExtrasChanges(ready.studioExtras!, [{ id: "flyer", note: "Change the photo." }], { at: AT, packageRound: 1, ridesPackageRevision: false });
    const pending = { ...ready, studioExtras: changed.ok ? changed.truth : undefined } as CampaignRecord;
    const exhausted = await produce(pending, failingAdapter());
    expect(exhausted.studioExtras!.records[0]!.state).toBe("exhausted");
    expect(exhausted.studioExtras!.revisionRounds![0]!.voidedAt).not.toBeNull();
    expect(accounting(exhausted)).toMatchObject({ used: 0, remainingIncluded: 3 });
  });

  it("22. Extra notes riding a package revision share that round and add no second count", async () => {
    const ready = await produce(campaign("clip_repurposing", ["flyer"]), passingAdapter());
    const changed = requestStudioExtrasChanges(ready.studioExtras!, [{ id: "flyer", note: "Use our fall colors." }], { at: AT, packageRound: 2, ridesPackageRevision: true });
    expect(changed.ok && changed.truth.revisionRounds).toBeFalsy();
    const truth = changed.ok ? changed.truth : ready.studioExtras!;
    expect(truth.records[0]).toMatchObject({ state: "revision_requested", lastRevisionRound: 2, revisionNote: "Use our fall colors." });
    expect(accounting({ ...ready, studioExtras: truth } as CampaignRecord)).toMatchObject({ used: 0, remainingIncluded: 3 });
  });

  it("23. Change requests are refused when empty, duplicated, or not in Review", async () => {
    const waiting = campaign("clip_repurposing", ["flyer"]).studioExtras!;
    const opts = { at: AT, packageRound: 1, ridesPackageRevision: false };
    expect(requestStudioExtrasChanges(waiting, [{ id: "flyer", note: "  " }], opts)).toMatchObject({ ok: false });
    expect(requestStudioExtrasChanges(waiting, [{ id: "flyer", note: "x" }], opts)).toMatchObject({ ok: false, error: "Flyer is not open for review right now." });
    const ready = (await produce(campaign("clip_repurposing", ["flyer"]), passingAdapter())).studioExtras!;
    expect(requestStudioExtrasChanges(ready, [{ id: "flyer", note: "a" }, { id: "flyer", note: "b" }], opts)).toMatchObject({ ok: false });
    expect(requestStudioExtrasChanges(ready, [{ id: "ad_creative", note: "a" }], opts)).toMatchObject({ ok: false });
  });

  it("24. Approve releases the Extra to Final Delivery as downloads; files outside the campaign folder are never served", async () => {
    const c = await produce(campaign("clip_repurposing", ["flyer"]), passingAdapter());
    const { truth, approved } = approveAndDeliverReadyStudioExtras(c.studioExtras!, AT);
    expect(approved).toEqual(["flyer"]);
    expect(truth.records[0]).toMatchObject({ state: "delivered", approvedAt: AT, deliveredAt: AT });
    const view = await resolveStudioExtrasCustomerView({ ...c, studioExtras: truth }, repoRoot);
    expect(view!.extras[0]!.files[0]!.href).toContain("purpose=download");
    expect(view!.extras[0]!.statusLine).toBe("Delivered in Final Delivery.");
    expect(studioExtraArtifactAllowed(CID, { path: `data/campaign-design-artifacts/${CID}/x.png` })).toBe(true);
    expect(studioExtraArtifactAllowed(CID, { path: "data/campaign-design-artifacts/other/x.png" })).toBe(false);
    expect(studioExtraArtifactAllowed(CID, { path: `data/campaign-design-artifacts/${CID}/../other/x.png` })).toBe(false);
    expect(studioExtraArtifactAllowed(CID, { path: ".env" })).toBe(false);
  });

  it("25. Voice, Help, builder, and checkout tell the same promise; a customer change during production is never overwritten", async () => {
    const explainer = studioExtrasExplainer();
    const faq = JSON.stringify(studioPolicies);
    expect(faq).toContain(explainer.whatYouCanAdd);
    expect(faq).toContain(explainer.promise);
    expect(faq).toContain(explainer.revisions);
    expect(answerCondensedLaunchVoice("What Studio Extras can I add?")).toBe(`${explainer.whatYouCanAdd} ${explainer.promise} ${explainer.notIncludedService}`);
    expect(answerCondensedLaunchVoice("Do Studio Extras cost extra?")).toContain("no additional charge");
    expect(answerCondensedLaunchVoice("Do changes to studio extras use a revision round?")).toBe(explainer.revisions);
    expect(answerCondensedLaunchVoice("What if an Extra cannot be completed?")).toBe(explainer.promise);
    for (const line of studioExtrasCustomerCopy.builderPromise) expect(explainer.promise).toContain(line);
    expect(studioExtrasCustomerCopy.builderLead).toContain("no additional charge");
    expect(studioExtrasCustomerCopy.checkoutIncluded).toBe("Included at no additional charge");
    expect(Object.values(studioExtrasEligibilityByPackage).flat()).not.toContain("ai_local_visibility");

    const started = (await produce(campaign("clip_repurposing", ["flyer", "ad_creative"]), passingAdapter())).studioExtras!;
    const changed = requestStudioExtrasChanges(started, [{ id: "flyer", note: "Bigger date." }], { at: "2026-10-10T15:05:00.000Z", packageRound: 1, ridesPackageRevision: false });
    const stored = changed.ok ? changed.truth : started;
    const produced = approveAndDeliverReadyStudioExtras(started, "2026-10-10T15:06:00.000Z").truth;
    const merged = mergeStudioExtrasAfterProduction(started, produced, stored, campaign("clip_repurposing", []), "2026-10-10T15:07:00.000Z");
    expect(merged.records.find((r) => r.id === "flyer")!.state).toBe("revision_requested");
    expect(merged.records.find((r) => r.id === "ad_creative")!.state).toBe("delivered");
    expect(merged.revisionRounds).toHaveLength(1);
    expect(settleStudioExtrasRevisionRounds(merged, AT).revisionRounds![0]!.reachedReviewAt).toBeNull();
  });
});
