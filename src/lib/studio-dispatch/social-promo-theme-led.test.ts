import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  createLiveLaneCapacityTracker,
  liveLaneForDispatchRecord,
} from "@/lib/job-control/live-lane-capacity";
import { reasonPromoCampaignSetDeterministic } from "@/lib/studio-design-renderer/promo-reason";
import { declaredTextFromPromoAsset } from "@/lib/studio-design-renderer/promo-render-html";
import { evaluatePromoSetConsistency } from "@/lib/studio-design-renderer/promo-set-qa";
import { validatePromoCampaignSetSpec } from "@/lib/studio-design-renderer/promo-validate";
import {
  reasonSocialPostCaptionsDeterministic,
  validateCaptionFacts,
} from "@/lib/studio-design-renderer/social-posts-captions";
import { reasonSocialPostsSetDeterministic } from "@/lib/studio-design-renderer/social-posts-reason";
import { declaredTextFromSocialPostAsset } from "@/lib/studio-design-renderer/social-posts-render-html";
import { evaluateSocialPostsSetConsistency } from "@/lib/studio-design-renderer/social-posts-set-qa";
import { validateSocialPostsSetSpec } from "@/lib/studio-design-renderer/social-posts-validate";
import { resolveSocialPostsPlatformPlacement } from "@/lib/studio-design-renderer/social-posts-intake-truth";
import {
  themeLedBeats,
  themeLedCopyPlan,
  themeLedInventedCtaFinding,
  themeLedRepetitionFinding,
  themeLedStatement,
} from "@/lib/studio-design-renderer/theme-led-campaign";

import { shouldObserveDesignRenderer } from "./design-renderer-observer";
import {
  mapSocialPromoThemeLedPromoTruth,
  mapSocialPromoThemeLedSocialTruth,
} from "./map-social-promo-theme-led-truth";
import {
  socialPromoParentProductionState,
  themeLedSetFingerprint,
} from "./social-promo-composite-dispatch";
import type { JobDispatchRecord } from "./types";

const THEME =
  "Promote The Studio as an easy creative-production partner for small business owners who need polished social media and promotional materials without spending hours creating everything themselves.";
const CORE = "Choose what you need, provide the information, and let The Studio handle the production.";
const PARENT_JOB = "theme-led-proof:social_and_promo_graphics";

function campaign(extra: Record<string, string> = {}): CampaignRecord {
  return {
    campaignId: "theme-led-proof",
    campaignName: "Proof Test Co",
    routeMapIntake: {
      submittedAt: "2026-10-10T08:49:04.923Z",
      answers: {
        "shared:businessName": "The Studio",
        "social_and_promo_graphics:purpose": THEME,
        "social_and_promo_graphics:mustKeep": CORE,
        "social_and_promo_graphics:rights": "I have permission to use the materials I am supplying.",
        ...extra,
      },
    },
  } as unknown as CampaignRecord;
}

function dispatch(branch: "social_posts" | "campaign_graphics"): JobDispatchRecord {
  return {
    dispatchId: `dd:${PARENT_JOB}:branch:${branch}`,
    jobId: `${PARENT_JOB}:branch:${branch}`,
    skuId: branch === "social_posts" ? "v2-rtu-social-posts" : "v2-rtu-promotion-graphics",
    executionIdentityReady: true,
    status: "EXECUTION_IDENTITY_READY",
    requirements: { primaryTool: { toolId: "studio_design_renderer" } },
  } as unknown as JobDispatchRecord;
}

const repoRoot = process.cwd();

describe("theme-led copy", () => {
  it("reads three steps from the core message and turns a brief into a statement", () => {
    expect(themeLedBeats(CORE)).toEqual([
      "Choose what you need.",
      "Provide the information.",
      "Let The Studio handle the production.",
    ]);
    expect(themeLedBeats("Just one idea.")).toBeNull();
    expect(themeLedStatement(THEME)).toBe(
      "The Studio is an easy creative-production partner for small business owners who need polished social media and promotional materials without spending hours creating everything themselves.",
    );
    expect(themeLedStatement("Fresh bread every morning.")).toBe("Fresh bread every morning.");
  });
});

describe("Social & Promo theme-led social posts", () => {
  it("builds four distinct posts and four captions with no invented CTA, price, date, or contact", () => {
    const mapped = mapSocialPromoThemeLedSocialTruth({
      repoRoot,
      campaign: campaign(),
      dispatchRecord: dispatch("social_posts"),
      materials: [],
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.wordmark).toBe("The Studio");
    const spec = reasonSocialPostsSetDeterministic(mapped.truth);
    expect(validateSocialPostsSetSpec(repoRoot, spec, mapped.truth)).toEqual({ ok: true });
    expect(spec.assets.map((a) => a.roleAngle)).toEqual([
      "theme_hero",
      "theme_step_first",
      "theme_step_second",
      "theme_brand_close",
    ]);

    const declared = Object.fromEntries(
      spec.assets.map((a) => [a.assetId, declaredTextFromSocialPostAsset(a)]),
    );
    for (const asset of spec.assets) {
      expect(asset.layers.some((l) => l.type === "text" && l.role === "cta")).toBe(false);
      expect(declared[asset.assetId]).not.toMatch(/\$\d|Proof Test Co/);
    }

    const captions = reasonSocialPostCaptionsDeterministic(mapped.truth, spec.assets);
    for (const caption of captions) {
      expect(validateCaptionFacts(caption, mapped.truth)).toEqual({ ok: true });
    }
    const postingOrder = captions.map((c) => ({
      position: c.orderIndex,
      assetId: c.assetId,
      captionId: c.captionId,
    }));
    const set = evaluateSocialPostsSetConsistency({
      truth: mapped.truth,
      spec,
      declaredTextByAsset: declared,
      captions,
      postingOrder,
    });
    expect(set.ok).toBe(true);
  });

  it("paints a supplied call to action and fails when a post drops the customer's wording", () => {
    const mapped = mapSocialPromoThemeLedSocialTruth({
      repoRoot,
      campaign: campaign({ "social_and_promo_graphics:cta": "Start your project today" }),
      dispatchRecord: dispatch("social_posts"),
      materials: [],
    });
    if (!mapped.ok) throw new Error(mapped.message);
    const spec = reasonSocialPostsSetDeterministic(mapped.truth);
    expect(
      spec.assets.filter((a) => a.layers.some((l) => l.type === "text" && l.role === "cta")),
    ).toHaveLength(2);

    const declared = Object.fromEntries(
      spec.assets.map((a) => [a.assetId, declaredTextFromSocialPostAsset(a)]),
    );
    declared["social-post-3"] = "The Studio";
    const captions = reasonSocialPostCaptionsDeterministic(mapped.truth, spec.assets);
    const set = evaluateSocialPostsSetConsistency({
      truth: mapped.truth,
      spec,
      declaredTextByAsset: declared,
      captions,
      postingOrder: captions.map((c) => ({ position: c.orderIndex, assetId: c.assetId, captionId: c.captionId })),
    });
    expect(set).toMatchObject({ ok: false, code: "SET_CONSISTENCY_FAILURE" });
  });

  it("fails closed instead of inventing steps, or dropping supplied facts", () => {
    const noCore = mapSocialPromoThemeLedSocialTruth({
      repoRoot,
      campaign: campaign({ "social_and_promo_graphics:mustKeep": "" }),
      dispatchRecord: dispatch("social_posts"),
      materials: [],
    });
    expect(noCore).toMatchObject({ ok: false, code: "MISSING_REQUIRED_TRUTH" });

    const withFacts = mapSocialPromoThemeLedSocialTruth({
      repoRoot,
      campaign: campaign({ "social_and_promo_graphics:facts": "Spring special $49 through May 1" }),
      dispatchRecord: dispatch("social_posts"),
      materials: [],
    });
    expect(withFacts).toMatchObject({ ok: false, code: "MISSING_REQUIRED_TRUTH" });
  });
});

describe("theme-led copy plan (internal QA repair)", () => {
  const textOf = (layers: readonly { type: string; content?: string }[]) =>
    layers.flatMap((l) => (l.type === "text" ? [l.content!] : []));

  it("gives every piece its own line and keeps Post 1 exactly as accepted", () => {
    const social = mapSocialPromoThemeLedSocialTruth({ repoRoot, campaign: campaign(), dispatchRecord: dispatch("social_posts"), materials: [] });
    const promo = mapSocialPromoThemeLedPromoTruth({ repoRoot, campaign: campaign(), dispatchRecord: dispatch("campaign_graphics"), materials: [] });
    if (!social.ok || !promo.ok) throw new Error("map failed");
    const posts = reasonSocialPostsSetDeterministic(social.truth).assets;
    const graphics = reasonPromoCampaignSetDeterministic(promo.truth).assets;
    const statement = themeLedStatement(THEME);

    expect(textOf(posts[0]!.layers)).toEqual(["The Studio", CORE, statement]);
    expect(textOf(posts[1]!.layers)).toEqual([
      "Step 1 of 3",
      "Choose what you need.",
      "Polished social media and promotional materials for small business owners.",
      "The Studio",
    ]);
    expect(textOf(posts[2]!.layers)).toEqual([
      "Step 2 of 3",
      "Provide the information.",
      "Without spending hours creating everything yourself.",
      "The Studio",
    ]);
    expect(textOf(posts[3]!.layers)).toEqual([
      "The Studio",
      "Step 3 of 3",
      "Let The Studio handle the production.",
      "Your easy creative-production partner.",
    ]);

    const square = textOf(graphics[0]!.layers);
    const portrait = textOf(graphics[1]!.layers);
    for (const painted of [square, portrait]) {
      expect(painted).not.toContain(CORE);
      expect(painted).not.toContain(statement);
      for (const beat of themeLedBeats(CORE)!) expect(painted).toContain(beat);
    }
    expect(portrait).toContain("Three steps to polished social media and promotional materials.");

    const captions = reasonSocialPostCaptionsDeterministic(social.truth, posts).map((c) => c.text);
    expect(captions).toEqual([
      "How does The Studio work? Three steps, one post at a time.",
      "Start by picking the pieces your business needs from The Studio.",
      "Provide the information. Share the details, and The Studio takes it from there.",
      "This is where The Studio takes over and handles the production for you.",
    ]);
    expect(captions.join(" ")).not.toMatch(/\bonce\b/);
  });

  it("treats an engagement prompt as a call to action the customer left blank", () => {
    expect(themeLedInventedCtaFinding("Three steps, one post at a time. Follow along.", "")).toBe("Follow along");
    expect(themeLedInventedCtaFinding("Share the details, and The Studio takes it from there.", "")).toBeNull();
    expect(themeLedInventedCtaFinding("Follow along.", "Follow along for the series")).toBeNull();

    const social = mapSocialPromoThemeLedSocialTruth({ repoRoot, campaign: campaign(), dispatchRecord: dispatch("social_posts"), materials: [] });
    if (!social.ok) throw new Error(social.message);
    const spec = reasonSocialPostsSetDeterministic(social.truth);
    const captions = reasonSocialPostCaptionsDeterministic(social.truth, spec.assets).map((c, i) =>
      i === 0 ? { ...c, text: `${c.text} Follow along.` } : c,
    );
    const set = evaluateSocialPostsSetConsistency({
      truth: social.truth,
      spec,
      declaredTextByAsset: Object.fromEntries(spec.assets.map((a) => [a.assetId, declaredTextFromSocialPostAsset(a)])),
      captions,
      postingOrder: captions.map((c) => ({ position: c.orderIndex, assetId: c.assetId, captionId: c.captionId })),
    });
    expect(set).toMatchObject({ ok: false });
  });

  it("rejects the old recycled pattern: core message over its own steps, or one line on two pieces", () => {
    const beats = themeLedBeats(CORE)!;
    expect(
      themeLedRepetitionFinding([{ id: "square", lines: ["The Studio", CORE, ...beats.map((b) => b)] }], CORE, beats),
    ).toMatch(/restates its steps/);
    const statement = themeLedStatement(THEME);
    expect(
      themeLedRepetitionFinding(
        [
          { id: "post-1", lines: [CORE, statement] },
          { id: "post-4", lines: ["Step 3 of 3", statement] },
        ],
        CORE,
        beats,
      ),
    ).toMatch(/repeated on post-1 and post-4/);
  });

  it("leaves supporting lines out rather than inventing them when the theme cannot be split", () => {
    const plan = themeLedCopyPlan({
      theme: { theme: "Fresh bread every morning.", coreMessage: CORE },
      wordmark: "The Studio",
      cta: "",
    });
    expect(plan.stepSupport).toEqual([null, null, null]);
    expect(plan.portraitLead).toBeNull();
  });

  it("a copy or layout correction with the same campaign facts is a new render, not the superseded one", () => {
    const promo = mapSocialPromoThemeLedPromoTruth({ repoRoot, campaign: campaign(), dispatchRecord: dispatch("campaign_graphics"), materials: [] });
    if (!promo.ok) throw new Error(promo.message);
    const assets = reasonPromoCampaignSetDeterministic(promo.truth).assets;
    const before = themeLedSetFingerprint("same-campaign-facts", assets);
    expect(themeLedSetFingerprint("same-campaign-facts", assets)).toBe(before);
    const moved = assets.map((asset, index) =>
      index === 0 ? { ...asset, layers: asset.layers.map((l) => (l.type === "text" ? { ...l, y: l.y + 1 } : l)) } : asset,
    );
    expect(themeLedSetFingerprint("same-campaign-facts", moved)).not.toBe(before);
    expect(
      themeLedSetFingerprint("same-campaign-facts", [...assets, { captionId: "caption-3", text: "Share the details once." }]),
    ).not.toBe(themeLedSetFingerprint("same-campaign-facts", [...assets, { captionId: "caption-3", text: "Share the details." }]));
  });

  it("does not show internal format notes on the posting order", () => {
    expect(resolveSocialPostsPlatformPlacement("I am not sure")).toMatchObject({
      ok: true,
      platformLabel: "Feed post — square 1024×1024",
    });
  });
});

describe("Social & Promo theme-led campaign graphics", () => {
  it("builds one square and one portrait, each carrying every step and the wordmark", () => {
    const mapped = mapSocialPromoThemeLedPromoTruth({
      repoRoot,
      campaign: campaign(),
      dispatchRecord: dispatch("campaign_graphics"),
      materials: [],
    });
    if (!mapped.ok) throw new Error(mapped.message);
    const spec = reasonPromoCampaignSetDeterministic(mapped.truth);
    expect(validatePromoCampaignSetSpec(repoRoot, spec, mapped.truth)).toEqual({ ok: true });
    expect(spec.assets.map((a) => [a.canvas.widthPx, a.canvas.heightPx])).toEqual([
      [1024, 1024],
      [1024, 1536],
    ]);
    const declared = Object.fromEntries(
      spec.assets.map((a) => [a.assetId, declaredTextFromPromoAsset(a)]),
    );
    expect(evaluatePromoSetConsistency({ truth: mapped.truth, spec, declaredTextByAsset: declared }).ok).toBe(true);
    for (const asset of spec.assets) {
      expect(asset.layers.some((l) => l.type === "image")).toBe(false);
      expect(asset.layers.some((l) => l.type === "text" && l.role === "cta")).toBe(false);
    }
  });
});

describe("Social & Promo render hold and parent state", () => {
  it("holds composite branches unless this project carries an owner release", () => {
    const record = dispatch("social_posts");
    expect(shouldObserveDesignRenderer(record)).toEqual({
      invoke: false,
      reason: "social_promo_composite_render_held",
    });
    expect(shouldObserveDesignRenderer(record, {})).toMatchObject({ invoke: false });
    expect(
      shouldObserveDesignRenderer(record, {
        socialPromoRenderRelease: {
          releasedAt: "2026-10-10T10:00:00.000Z",
          authorizedBy: "owner",
          reason: "proof",
        },
      }),
    ).toEqual({ invoke: true });
  });

  it("reports complete only when both branches rendered", () => {
    const social = dispatch("social_posts");
    const graphics = dispatch("campaign_graphics");
    const withResults = (results: object[]) =>
      ({
        dispatchExecution: {
          records: [social, graphics],
          designRendererObserver: { results },
        },
      }) as unknown as CampaignRecord;
    const ok = (d: JobDispatchRecord) => ({ dispatchId: d.dispatchId, action: "invoked", ok: true });

    expect(socialPromoParentProductionState(withResults([])).state).toBe("not_started");
    expect(socialPromoParentProductionState(withResults([ok(social)])).state).toBe("incomplete");
    expect(
      socialPromoParentProductionState(
        withResults([
          ok(social),
          { dispatchId: graphics.dispatchId, action: "invoked", ok: false, failureCode: "QA_FAILURE" },
        ]),
      ).state,
    ).toBe("failed");
    expect(
      socialPromoParentProductionState(
        withResults([
          { dispatchId: social.dispatchId, action: "skipped", ok: true, skipReason: "social_promo_composite_render_held" },
          { dispatchId: graphics.dispatchId, action: "skipped", ok: true, skipReason: "social_promo_composite_render_held" },
        ]),
      ).state,
    ).toBe("held");
    const slotWait = socialPromoParentProductionState(
      withResults([
        ok(social),
        { dispatchId: graphics.dispatchId, action: "skipped", ok: true, skipReason: "waiting_for_production_slot" },
      ]),
    );
    expect(slotWait.state).toBe("incomplete");
    expect(slotWait.branches[1]).toMatchObject({ state: "waiting", skipReason: "waiting_for_production_slot" });
    expect(socialPromoParentProductionState(withResults([ok(social), ok(graphics)])).state).toBe("complete");
  });

  it("both branches share the parent job's production slot", () => {
    const social = dispatch("social_posts");
    const graphics = dispatch("campaign_graphics");
    const parentJobId = social.jobId.slice(0, social.jobId.indexOf(":branch:"));
    const lane = liveLaneForDispatchRecord(social).productionLane;
    const views = (["quick", "standard", "heavy"] as const).map((entry) => ({
      lane: entry,
      capacity: 2,
      activeCount: entry === lane ? 1 : 0,
      activeJobs: entry === lane ? [{ jobId: parentJobId }] : [],
    })) as unknown as Parameters<typeof createLiveLaneCapacityTracker>[0];
    const tracker = createLiveLaneCapacityTracker(views);
    for (const record of [social, graphics]) {
      const ref = liveLaneForDispatchRecord(record);
      expect(ref.jobId).toBe(parentJobId);
      expect(tracker.allows(ref)).toBe(true);
      tracker.occupy(ref);
    }
    const other = liveLaneForDispatchRecord({ ...social, jobId: "other-campaign:v2-rtu-social-posts" });
    expect(tracker.allows(other)).toBe(true);
    tracker.occupy(other);
    const third = liveLaneForDispatchRecord({ ...social, jobId: "third-campaign:v2-rtu-social-posts" });
    expect(tracker.allows(third)).toBe(false);
  });
});
