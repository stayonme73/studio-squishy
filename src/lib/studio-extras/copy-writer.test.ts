import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { produceCopyFromFacts, writeCopyFromFacts } from "@/lib/studio-copy-production";

import {
  checkAdCopy,
  classifyExtrasWriterFailure,
  normalizeAdCopyBeats,
  ensureStudioExtrasRuntimeEnv,
  writeExtrasCopy,
  type AdCopy,
  type ExtrasCopyFacts,
  type ReviewMessagesCopy,
} from "./copy-writer";
import { runStudioExtrasProduction, studioExtraUnitAdapters, type StudioExtraUnit } from "./production";

const LINK = "https://harborandoak.example/review";

const FACTS: ExtrasCopyFacts = {
  businessName: "Harbor & Oak Home Services",
  offer: "Spring Tune-Up + Drain Clear\n$189",
  cta: "Book online or call",
  reviewLink: LINK,
  contact: "(804) 555-0142",
  mustNot: "Spring Check",
};

function reviewDraft(extra = ""): ReviewMessagesCopy {
  return {
    kind: "review_messages",
    text: `Harbor & Oak Home Services: please leave a review at ${LINK}`,
    email: {
      subject: "How was your visit?",
      body: [
        "Harbor & Oak Home Services would like to hear how your visit went.",
        `If you have a minute, please leave a review at ${LINK}.`,
        "Book online or call when you want the Spring Tune-Up + Drain Clear again.",
        extra,
      ].join(" "),
    },
    thankYou: {
      subject: "Thank you",
      body: "Thank you for taking the time to review Harbor & Oak Home Services.",
    },
    card: {
      headline: "Review Harbor & Oak",
      line: "Tell a neighbor about your visit.",
    },
  };
}

function adDraft(): AdCopy {
  return {
    kind: "ad_copy",
    options: [
      { headline: "Spring tune-up", primaryText: "Book online or call for a Spring Tune-Up + Drain Clear." },
      { headline: "Home services", primaryText: "Harbor & Oak Home Services. Steady HVAC care." },
      { headline: "Drain clear", primaryText: "Drain clear with a spring tune-up from Harbor." },
    ],
    graphic: {
      theme: "Spring Tune-Up + Drain Clear",
      beats: ["Spring tune-up", "Drain clear", "Book online or call"],
    },
  };
}

function anthropicResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function textPayload(copy: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(copy) }],
    usage: { input_tokens: 12, output_tokens: 20 },
  };
}

const priorKey = process.env.ANTHROPIC_API_KEY;
const priorNode = process.env.NODE_ENV;

afterEach(() => {
  vi.unstubAllGlobals();
  if (priorKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = priorKey;
  process.env.NODE_ENV = priorNode;
});

describe("Extras text writer", () => {
  it("does not call the provider when the credential is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await writeExtrasCopy("review_messages", FACTS, 2);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("WRITER_UNAVAILABLE");
    expect(result.category).toBe("missing_credentials");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("classifies a rejected credential once and does not spend a copy attempt", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-real";
    const fetchMock = vi.fn(async () =>
      anthropicResponse(401, { error: { type: "authentication_error", message: "invalid x-api-key" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await writeExtrasCopy("ad_copy", FACTS, 2);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("WRITER_PROVIDER_FAILURE");
    expect(result.category).toBe("authentication");
    expect(result.httpStatus).toBe(401);
    expect(result.attempts).toEqual([]);
    expect(result.message).not.toMatch(/sk-ant|x-api-key/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops on a billing refusal without a retry", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-real";
    const fetchMock = vi.fn(async () =>
      anthropicResponse(400, {
        error: { type: "invalid_request_error", message: "Your credit balance is too low" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await writeExtrasCopy("review_messages", FACTS, 2);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.category).toBe("billing");
    expect(result.attempts).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries provider unavailability once, then waits", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-real";
    const fetchMock = vi.fn(async () => anthropicResponse(503, { error: { type: "overloaded_error", message: "overloaded" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await writeExtrasCopy("ad_copy", FACTS, 2);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.category).toBe("unavailable");
    expect(result.attempts).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a network failure once, then waits", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-real";
    const fetchMock = vi.fn(async () => {
      throw new Error("socket hang up");
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await writeExtrasCopy("review_messages", FACTS, 2);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.category).toBe("network");
    expect(result.attempts).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("accepts a draft after one transient failure without counting that failure as copy quality", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-real";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(anthropicResponse(429, { error: { type: "rate_limit_error", message: "slow down" } }))
      .mockResolvedValueOnce(anthropicResponse(200, textPayload(reviewDraft())));
    vi.stubGlobal("fetch", fetchMock);
    const result = await writeExtrasCopy<ReviewMessagesCopy>("review_messages", FACTS, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attempts).toEqual([{ outcome: "passed", reasons: [] }]);
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 20 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses the copy budget when the draft invents a price", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-real";
    const fetchMock = vi.fn(async () => anthropicResponse(200, textPayload(reviewDraft("A $999 special."))));
    vi.stubGlobal("fetch", fetchMock);
    const result = await writeExtrasCopy("review_messages", FACTS, 2);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("COPY_QA_EXHAUSTED");
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]?.reasons.join(" ")).toMatch(/invented numbers/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a city the customer did not supply", () => {
    const draft = adDraft();
    draft.options[1]!.primaryText = "HVAC tune-up for Richmond homeowners.";
    expect(checkAdCopy(draft, FACTS).join(" ")).toMatch(/Richmond/);
  });

  it("drops a comma inside a graphic beat so a supplied date can be shown", () => {
    const draft = adDraft();
    draft.graphic.beats = ["March 10 – April 15, 2026", "Keep $189", "Book online"];
    const normalized = normalizeAdCopyBeats(draft);
    expect(normalized.graphic.beats[0]).toBe("March 10 – April 15 2026");
    expect(normalized.graphic.beats[0]?.includes(",")).toBe(false);
    expect(checkAdCopy(normalized, FACTS)).not.toContain("beat 1 cannot contain a comma");
    expect(checkAdCopy(normalized, FACTS).join(" ")).not.toMatch(/beat 1 must be/);
  });

  it("accepts a supplied price when a sentence period follows it", () => {
    const reasons = checkAdCopy(
      {
        kind: "ad_copy",
        options: [
          { headline: "Spring tune-up", primaryText: "Book the tune-up for $189." },
          { headline: "Drain clear", primaryText: "Call to book the drain clear." },
          { headline: "Open this spring", primaryText: "Plain, steady home service." },
        ],
        graphic: { theme: "Spring Tune-Up + Drain Clear", beats: ["Tune-up", "Drain clear", "Book now"] },
      },
      FACTS,
    );
    expect(reasons.join(" ")).not.toMatch(/invented numbers/);
  });

  it("accepts structured Review Request and Ad Creative drafts", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-real";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(anthropicResponse(200, textPayload(reviewDraft())))
      .mockResolvedValueOnce(anthropicResponse(200, textPayload(adDraft())));
    vi.stubGlobal("fetch", fetchMock);
    const review = await writeExtrasCopy<ReviewMessagesCopy>("review_messages", FACTS, 2);
    const ad = await writeExtrasCopy<AdCopy>("ad_copy", FACTS, 2);
    expect(review.ok).toBe(true);
    expect(ad.ok).toBe(true);
    if (!review.ok || !ad.ok) return;
    expect(review.copy.email.body).toContain(LINK);
    expect(review.copy.text).not.toMatch(/\$999|5-star|guarantee/i);
    expect(ad.copy.options).toHaveLength(3);
    expect(ad.copy.graphic.beats).toHaveLength(3);
  });

  it("leaves the package copy path on the structured writer when no credential is present", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const facts = {
      skuId: "v2-rtu-email-kit" as const,
      businessName: "Harbor & Oak Home Services",
      campaignGoal: "Spring service you can trust",
      mustInclude: "Spring Tune-Up + Drain Clear $189. Call (804) 555-0142",
      callToAction: "Book online or call",
      compliance: "Reply STOP to opt out.",
      mustNotSay: "Spring Check",
      messageCopy: "",
      sendingAccount: "customer sends",
      listConsent: "Yes — I own the list and have consent",
      emailCount: 1 as const,
    };
    const local = writeCopyFromFacts(facts);
    const produced = await produceCopyFromFacts(facts);
    expect(local.ok).toBe(true);
    expect(produced.ok).toBe(true);
    if (!produced.ok) return;
    expect(produced.writingRuntime).toBe("structured_writer");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks Machine to wait when the provider rejects the writer", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-real";
    vi.stubGlobal("fetch", vi.fn(async () => anthropicResponse(401, { error: { type: "authentication_error", message: "no" } })));
    const unit: StudioExtraUnit = {
      unitId: "review-messages",
      label: "Review-request messages",
      kind: "copy",
      productionLine: "studio-extras-copy",
      budget: 2,
      attempts: [],
      recovery: { available: false, attempted: false },
      quality: { outcome: "pending" },
      artifacts: [],
    };
    const run = await studioExtraUnitAdapters["review_request_kit:review-messages"]!({
      repoRoot: tmpdir(),
      campaign: { campaignId: "writer-wait", campaignName: "Harbor & Oak" } as CampaignRecord,
      materials: [],
      values: { review_link: LINK, text_consent: "yes", cta: FACTS.cta, offer: FACTS.offer },
      facts: {
        businessName: FACTS.businessName,
        offer: FACTS.offer,
        cta: FACTS.cta,
        contact: FACTS.contact ?? "",
        mustKeep: "",
        mustNot: FACTS.mustNot ?? "",
      },
      extraId: "review_request_kit",
      unit,
      route: "primary",
      remainingBudget: 2,
      revisionNote: null,
      earlierUnits: [],
    });
    expect(run.ok).toBe(false);
    expect(run.attempts).toEqual([]);
    expect(run.waitingOnSystem).toBe("The Studio's writer could not sign in.");
  });

  it("loads a standalone env file without replacing a key the process already has", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "studio-extras-env-"));
    writeFileSync(path.join(dir, ".env.local"), "ANTHROPIC_API_KEY=sk-ant-from-file\n", "utf8");
    delete process.env.ANTHROPIC_API_KEY;
    process.env.NODE_ENV = "development";
    try {
      ensureStudioExtrasRuntimeEnv(dir);
      expect(process.env.ANTHROPIC_API_KEY).toBe("sk-ant-from-file");
      process.env.ANTHROPIC_API_KEY = "already-set";
      writeFileSync(path.join(dir, ".env.local"), "ANTHROPIC_API_KEY=sk-ant-other\n", "utf8");
      ensureStudioExtrasRuntimeEnv(dir);
      expect(process.env.ANTHROPIC_API_KEY).toBe("already-set");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not read the owner env file during a unit-test production run", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "studio-extras-env-"));
    writeFileSync(path.join(dir, ".env.local"), "ANTHROPIC_API_KEY=sk-ant-from-file\n", "utf8");
    delete process.env.ANTHROPIC_API_KEY;
    try {
      await runStudioExtrasProduction({
        repoRoot: dir,
        campaign: { campaignId: "env-guard" } as CampaignRecord,
        materials: [],
      });
      expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("names provider failures without treating every refusal as a network loss", () => {
    expect(classifyExtrasWriterFailure(429, "rate_limit_error", "slow down")).toBe("rate_limit");
    expect(classifyExtrasWriterFailure(401, "authentication_error", "invalid")).toBe("authentication");
    expect(classifyExtrasWriterFailure(400, "invalid_request_error", "credit balance is too low")).toBe("billing");
    expect(classifyExtrasWriterFailure(null, "", "")).toBe("network");
  });
});
