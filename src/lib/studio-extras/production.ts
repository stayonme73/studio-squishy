/**
 * Studio Extras production. Each selected Extra becomes real work units on the
 * Studio's existing production lines; attempts, recovery, and Quality are
 * written to the shared truth (`campaign.studioExtras`).
 */

import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import type { ServiceId } from "@/catalog/types";
import type { RouteMapIntakeAnswers } from "@/catalog/intake";
import type { CampaignRecord } from "@/config/studio-board";
import type { StudioExtraId } from "@/config/studio-extras-v1";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  PROMO_PORTRAIT_PLATE,
  PROMO_SQUARE_PLATE,
  runPromoJobPipeline,
} from "@/lib/studio-design-renderer";
import type { PromoProjectTruth } from "@/lib/studio-design-renderer";
import { invokeCopyDispatchHook } from "@/lib/studio-dispatch/copy-dispatch-hook";
import { invokeDesignRendererDispatchHook } from "@/lib/studio-dispatch/design-renderer-hook";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import { customerArtifactRootRel } from "@/lib/studio-dispatch/map-flyer-job-truth";
import { invokeMenuDispatchHook } from "@/lib/studio-dispatch/menu-dispatch-hook";
import { invokeServiceSheetDispatchHook } from "@/lib/studio-dispatch/service-sheet-dispatch-hook";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";

import { collectProviderCost } from "@/lib/studio-project-alpha/cost-telemetry";

import {
  ensureStudioExtrasRuntimeEnv,
  writeExtrasCopy,
  type AdCopy,
  type ExtrasCopyFacts,
  type ReviewMessagesCopy,
} from "./copy-writer";
import {
  appendFulfillmentUsage,
  fulfillmentLinesFromProviderLedger,
  qualityUsageLine,
  refundUsageLine,
} from "./fulfillment-usage";
import {
  STUDIO_EXTRA_INPUT_SPECS,
  studioExtraInputValues,
  studioExtraMenuKind,
  studioExtrasPackageFacts,
  type StudioExtraInputValues,
  type StudioExtrasPackageFacts,
} from "./inputs";
import {
  markStudioExtraInProduction,
  markStudioExtraWaitingOnSystem,
  recordStudioExtraAttempt,
  recordStudioExtraQuality,
  refreshStudioExtrasInputs,
  settleStudioExtrasRevisionRounds,
  withStudioExtrasCourtesy,
} from "./machine";
import { renderReviewCard } from "./review-card";
import type {
  CampaignStudioExtras,
  StudioExtraArtifact,
  StudioExtraAttemptOutcome,
  StudioExtraRecord,
  StudioExtraUnit,
} from "./types";

export type UnitRun = {
  ok: boolean;
  /** Attempts this call made, in order. */
  attempts: { outcome: StudioExtraAttemptOutcome; reasons: string[] }[];
  artifacts: StudioExtraArtifact[];
  /** The unit could not run for a reason outside production (writer down, logo held). */
  waitingOnSystem?: string;
  qualitySummary: string;
};

export type UnitContext = {
  repoRoot: string;
  campaign: CampaignRecord;
  materials: readonly CampaignMaterialItem[];
  values: StudioExtraInputValues;
  facts: StudioExtrasPackageFacts;
  extraId: StudioExtraId;
  unit: StudioExtraUnit;
  route: "primary" | "recovery";
  /** Attempts left in the primary budget when this call starts. */
  remainingBudget: number;
  revisionNote: string | null;
  /** Artifacts already passed for earlier units of the same Extra. */
  earlierUnits: readonly StudioExtraUnit[];
};

export type UnitAdapter = (ctx: UnitContext) => Promise<UnitRun>;

function artifactRoot(campaignId: string, extraId: StudioExtraId, unitId: string): string {
  return `data/campaign-design-artifacts/${campaignId}/studio-extras/${extraId}/${unitId}`;
}

function viewCampaign(
  campaign: CampaignRecord,
  sku: string,
  fields: Record<string, string>,
): CampaignRecord {
  const answers: RouteMapIntakeAnswers = { ...(campaign.routeMapIntake?.answers ?? {}) };
  for (const [key, value] of Object.entries(fields)) {
    if (value.trim()) answers[`${sku}:${key}`] = value.trim();
  }
  return {
    ...campaign,
    campaignName: campaign.condensedOffer?.company?.trim() || campaign.campaignName,
    routeMapIntake: {
      answers,
      submittedAt: campaign.routeMapIntake?.submittedAt ?? new Date().toISOString(),
    },
  };
}

function extrasDispatchRecord(
  campaignId: string,
  extraId: StudioExtraId,
  unitId: string,
  sku: string,
  salt: string,
): JobDispatchRecord {
  const jobId = `${campaignId}:studio-extra:${extraId}:${unitId}`;
  const fingerprint = createHash("sha256").update(`${jobId}:${salt}`).digest("hex").slice(0, 16);
  return evaluateJobDispatch({
    campaignId,
    jobId,
    skuId: sku as ServiceId,
    routing: {
      decisionId: `rd:${jobId}:${fingerprint}`,
      jobId,
      campaignId,
      skuId: sku as ServiceId,
      status: "READY_FOR_DISPATCH",
      readyForDispatch: true,
      productionFamilyId: null,
      controlLane: "standard",
      capabilityReadiness: "contract_ready",
      factFingerprint: fingerprint,
      evaluatedAt: new Date().toISOString(),
      reason: null,
      blocker: null,
      ownerActionRequired: false,
    },
  });
}

function writeText(repoRoot: string, rel: string, body: string): void {
  const abs = path.join(repoRoot, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, body, "utf8");
}

function copyFacts(ctx: UnitContext): ExtrasCopyFacts {
  return {
    businessName: ctx.facts.businessName || ctx.campaign.campaignName,
    offer: [ctx.values.offer ?? "", ctx.revisionNote ? `Customer change request: ${ctx.revisionNote}` : ""]
      .filter(Boolean)
      .join("\n"),
    cta: ctx.values.cta ?? "",
    reviewLink: ctx.values.review_link,
    contact: ctx.values.contact,
    mustNot: ctx.facts.mustNot,
  };
}

/** Logo for design lines: only an approved, locally staged file is placed. */
function logoForSku(
  materials: readonly CampaignMaterialItem[],
  sku: string,
): { materials: CampaignMaterialItem[]; staged?: string; held?: string } {
  const logo = materials.find(
    (item) => item.id === STUDIO_EXTRA_INPUT_SPECS.logo.slotId || item.id === "condensed-social-logo",
  );
  if (!logo || logo.reviewStatus === "missing" || logo.clientAvailability === "not_available_yet") {
    return { materials: [] };
  }
  if (logo.reviewStatus !== "approved_for_use") {
    return { materials: [], held: "Your logo is waiting for the Studio's file check before it can be placed." };
  }
  const staged = [logo.url, logo.teamNote].find((v) => v && /^(data|docs)\//.test(v));
  if (!staged) {
    return { materials: [], held: "Your logo file is stored but not yet staged for the design line." };
  }
  return { materials: [{ ...logo, relatedServiceIds: [sku as ServiceId] }], staged };
}

// ---------------------------------------------------------------------------
// Adapters

const emailOrTexts: UnitAdapter = async (ctx) => {
  const sku = ctx.unit.productionLine as "v2-rtu-email-kit" | "v2-rtu-sms-kit";
  const offer = ctx.values.offer ?? "";
  const campaign = viewCampaign(ctx.campaign, sku, {
    businessName: ctx.facts.businessName,
    campaignGoal: offer.split(/\n/)[0] ?? offer,
    mustInclude: [offer, ctx.revisionNote ? `Requested change: ${ctx.revisionNote}` : ""].filter(Boolean).join("\n"),
    callToAction: ctx.values.cta ?? "",
    mustNotSay: ctx.facts.mustNot,
    listConsent: ctx.values.text_consent ? "yes — customer confirmed consent in My Studio" : "",
    messageCopy: sku === "v2-rtu-sms-kit" ? offer.split(/\n/).slice(0, 2).join("\n") : "",
  });
  const record = extrasDispatchRecord(ctx.campaign.campaignId, ctx.extraId, ctx.unit.unitId, sku, `${offer}|${ctx.revisionNote ?? ""}`);
  const result = await invokeCopyDispatchHook({ repoRoot: ctx.repoRoot, campaign, dispatchRecord: record });
  if (!result.ok) {
    if (result.failureCode === "MISSING_REQUIRED_FACTS" || result.failureCode === "CONSENT_NOT_CONFIRMED") {
      return { ok: false, attempts: [], artifacts: [], waitingOnSystem: result.message, qualitySummary: result.message };
    }
    const failed = Math.max(ctx.remainingBudget, 1);
    return {
      ok: false,
      attempts: Array.from({ length: failed }, () => ({ outcome: "failed" as const, reasons: [result.failureCode] })),
      artifacts: [],
      qualitySummary: result.message,
    };
  }
  const submission = JSON.parse(readFileSync(path.join(ctx.repoRoot, result.artifactRelativePath), "utf8")) as {
    submission: { emails?: { subjectOptions: string[]; previewText: string; body: string; cta: string }[]; smsMessages?: { body: string }[] };
  };
  const root = artifactRoot(ctx.campaign.campaignId, ctx.extraId, ctx.unit.unitId);
  const artifacts: StudioExtraArtifact[] = [];
  if (sku === "v2-rtu-email-kit") {
    const email = result.pasteReadyFiles.filter((f) => /email-1\.(txt|html)$/.test(f.relativePath));
    for (const file of email) {
      artifacts.push({
        path: file.relativePath,
        label: file.format === "html" ? "Promotional email (HTML-ready)" : "Promotional email (plain text)",
        mimeType: file.format === "html" ? "text/html" : "text/plain",
      });
    }
  } else {
    const texts = (submission.submission.smsMessages ?? []).slice(0, 2);
    const rel = `${root}/text-messages.txt`;
    writeText(
      ctx.repoRoot,
      rel,
      ["Text messages", "", ...texts.flatMap((m, i) => [`Text ${i + 1}`, m.body.trim(), ""])].join("\n"),
    );
    artifacts.push({ path: rel, label: "Two text messages (plain text)", mimeType: "text/plain" });
  }
  const attemptsUsed = Math.max(result.attempts, 1);
  return {
    ok: true,
    attempts: [
      ...Array.from({ length: attemptsUsed - 1 }, () => ({ outcome: "failed" as const, reasons: ["copy QA correction"] })),
      { outcome: "passed" as const, reasons: [] },
    ],
    artifacts,
    qualitySummary: "Passed Studio copy QA: required facts, CTA, claims, and length.",
  };
};

const reviewMessages: UnitAdapter = async (ctx) => {
  const written = await writeExtrasCopy<ReviewMessagesCopy>("review_messages", copyFacts(ctx), ctx.remainingBudget);
  if (!written.ok) {
    if (written.code === "WRITER_UNAVAILABLE" || written.code === "WRITER_PROVIDER_FAILURE") {
      return { ok: false, attempts: [], artifacts: [], waitingOnSystem: written.message, qualitySummary: written.message };
    }
    return { ok: false, attempts: written.attempts, artifacts: [], qualitySummary: written.attempts.at(-1)?.reasons.join("; ") ?? written.message };
  }
  const root = artifactRoot(ctx.campaign.campaignId, ctx.extraId, ctx.unit.unitId);
  const c = written.copy;
  const files: [string, string, string][] = [
    ["review-request-text.txt", "Review-request text message", `${c.text}\n`],
    ["review-request-email.txt", "Review-request email", `Subject: ${c.email.subject}\n\n${c.email.body}\n`],
    ["thank-you-follow-up.txt", "Thank-you follow-up", `Subject: ${c.thankYou.subject}\n\n${c.thankYou.body}\n`],
  ];
  for (const [name, , body] of files) writeText(ctx.repoRoot, `${root}/${name}`, body);
  writeText(ctx.repoRoot, `${root}/review-messages.json`, `${JSON.stringify(c, null, 2)}\n`);
  return {
    ok: true,
    attempts: written.attempts,
    artifacts: files.map(([name, label]) => ({ path: `${root}/${name}`, label, mimeType: "text/plain" })),
    qualitySummary: "Passed Studio copy QA: exact review link, no incentive, no review filtering, no invented claims.",
  };
};

function readEarlierJson<T>(ctx: UnitContext, unitId: string, file: string): T | null {
  const unit = ctx.earlierUnits.find((u) => u.unitId === unitId);
  if (!unit || unit.quality.outcome !== "passed") return null;
  const rel = `${artifactRoot(ctx.campaign.campaignId, ctx.extraId, unitId)}/${file}`;
  try {
    return JSON.parse(readFileSync(path.join(ctx.repoRoot, rel), "utf8")) as T;
  } catch {
    return null;
  }
}

const reviewCard: UnitAdapter = async (ctx) => {
  const copy = readEarlierJson<ReviewMessagesCopy>(ctx, "review-messages", "review-messages.json");
  if (!copy) {
    return { ok: false, attempts: [], artifacts: [], waitingOnSystem: "Card waits for the approved review-request copy.", qualitySummary: "" };
  }
  const attempts: UnitRun["attempts"] = [];
  const tries = ctx.route === "recovery" ? 1 : ctx.remainingBudget;
  for (let i = 0; i < tries; i += 1) {
    const result = await renderReviewCard({
      repoRoot: ctx.repoRoot,
      artifactRootRel: artifactRoot(ctx.campaign.campaignId, ctx.extraId, ctx.unit.unitId),
      businessName: ctx.facts.businessName || ctx.campaign.campaignName,
      headline: copy.card.headline,
      line: copy.card.line,
      reviewLink: ctx.values.review_link ?? "",
      variant: ctx.route === "recovery" ? "simple" : "designed",
      attempt: ctx.unit.attempts.length + attempts.length + 1,
    });
    if (result.ok) {
      attempts.push({ outcome: "passed", reasons: [] });
      return { ok: true, attempts, artifacts: result.artifacts, qualitySummary: "Passed card QA: QR opens the exact review link, no overflow, PNG and 4x6 PDF exported." };
    }
    attempts.push({ outcome: "failed", reasons: result.reasons });
  }
  return { ok: false, attempts, artifacts: [], qualitySummary: attempts.at(-1)?.reasons.join("; ") ?? "" };
};

const adCopy: UnitAdapter = async (ctx) => {
  const written = await writeExtrasCopy<AdCopy>("ad_copy", copyFacts(ctx), ctx.remainingBudget);
  if (!written.ok) {
    if (written.code === "WRITER_UNAVAILABLE" || written.code === "WRITER_PROVIDER_FAILURE") {
      return { ok: false, attempts: [], artifacts: [], waitingOnSystem: written.message, qualitySummary: written.message };
    }
    return { ok: false, attempts: written.attempts, artifacts: [], qualitySummary: written.attempts.at(-1)?.reasons.join("; ") ?? written.message };
  }
  const root = artifactRoot(ctx.campaign.campaignId, ctx.extraId, ctx.unit.unitId);
  const body = written.copy.options
    .map((o, i) => `Option ${i + 1}\nHeadline: ${o.headline}\nMain text: ${o.primaryText}\n`)
    .join("\n");
  writeText(ctx.repoRoot, `${root}/ad-copy.txt`, `Ad copy — paste-ready\n\n${body}`);
  writeText(ctx.repoRoot, `${root}/ad-copy.json`, `${JSON.stringify(written.copy, null, 2)}\n`);
  return {
    ok: true,
    attempts: written.attempts,
    artifacts: [{ path: `${root}/ad-copy.txt`, label: "Three headline and main-text options", mimeType: "text/plain" }],
    qualitySummary: "Passed Studio copy QA: 3 distinct options, length limits, no invented numbers or claims.",
  };
};

const adGraphics: UnitAdapter = async (ctx) => {
  const copy = readEarlierJson<AdCopy>(ctx, "ad-copy", "ad-copy.json");
  if (!copy) {
    return { ok: false, attempts: [], artifacts: [], waitingOnSystem: "Ad graphics wait for the approved ad copy.", qualitySummary: "" };
  }
  const businessName = ctx.facts.businessName || ctx.campaign.campaignName;
  const supplied = `${ctx.values.offer ?? ""}\n${ctx.values.cta ?? ""}\n${ctx.values.contact ?? ""}`;
  const suppliedPhone = supplied.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] ?? "";
  const theme = ctx.route === "recovery" ? copy.options[0]!.headline : copy.graphic.theme;
  const coreMessage = copy.graphic.beats.join(", ");
  const painted = `${coreMessage}\n${ctx.values.cta ?? ""}`;
  const priceOnGraphic = painted.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/)?.[0]?.replace(/\s+/g, "") ?? "";
  const themeForLayout = priceOnGraphic
    ? theme
    : theme.replace(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, "").replace(/\s{2,}/g, " ").trim();
  const attempts: UnitRun["attempts"] = [];
  const tries = ctx.route === "recovery" ? 1 : ctx.remainingBudget;
  for (let i = 0; i < tries; i += 1) {
    const n = ctx.unit.attempts.length + attempts.length + 1;
    const record = extrasDispatchRecord(ctx.campaign.campaignId, ctx.extraId, ctx.unit.unitId, "v2-rtu-promotion-graphics", `${coreMessage}|${theme}|${n}`);
    const truth: PromoProjectTruth = {
      campaignId: ctx.campaign.campaignId,
      jobId: record.jobId,
      dispatchId: record.dispatchId,
      skuId: "v2-rtu-promotion-graphics",
      fixtureId: `job-${ctx.campaign.campaignId}`,
      label: "CUSTOMER JOB — Studio Extra Ad Creative",
      outputMode: "customer",
      contentMode: "theme_led",
      themeLed: { theme: themeForLayout, coreMessage },
      businessName,
      wordmark: businessName,
      descriptor: "",
      headline: coreMessage,
      offerName: "",
      priceDisplay: priceOnGraphic,
      dateWindow: "",
      body: theme,
      cta: ctx.values.cta ?? "",
      phone: suppliedPhone,
      webDisplay: "",
      webUrl: "",
      disclaimer: "",
      brandColors: { primary: "#1F3A5F", secondary: "#C4A574", background: "#F7F4EF", text: "#1A1A1A", muted: "#5A6570" },
      materials: [],
      approvedLogoVariantId: "wordmark-only",
      requiredTextTokens: [businessName, ...copy.graphic.beats],
      prohibitedClaimPatterns: ["CERTIFICATION FIXTURE", "#1 rated", "guaranteed"],
      assets: [
        {
          assetId: "ad-square",
          authorizedPurpose: "Static ad, square",
          plateId: PROMO_SQUARE_PLATE.plateId,
          canvas: { widthPx: PROMO_SQUARE_PLATE.widthPx, heightPx: PROMO_SQUARE_PLATE.heightPx },
          layoutVariant: "compact_square",
        },
        {
          assetId: "ad-portrait",
          authorizedPurpose: "Static ad, portrait",
          plateId: PROMO_PORTRAIT_PLATE.plateId,
          canvas: { widthPx: PROMO_PORTRAIT_PLATE.widthPx, heightPx: PROMO_PORTRAIT_PLATE.heightPx },
          layoutVariant: "tall_portrait",
        },
      ],
      liveIntakePerAssetPurposeGap: "Studio Extra Ad Creative — square and portrait fixed by the Extra's scope.",
    } as PromoProjectTruth;
    const result = await runPromoJobPipeline({
      repoRoot: ctx.repoRoot,
      truth,
      artifactRootRel: customerArtifactRootRel(ctx.campaign.campaignId, record.dispatchId),
    });
    if (result.ok) {
      attempts.push({ outcome: "passed", reasons: [] });
      return {
        ok: true,
        attempts,
        artifacts: result.identity.assets.map((asset) => ({
          path: asset.pngRelativePath,
          label: asset.layoutVariant === "compact_square" ? "Square ad graphic (PNG)" : "Portrait ad graphic (PNG)",
          mimeType: "image/png",
        })),
        qualitySummary: `Passed design QA: ${result.qaSummary}`,
      };
    }
    attempts.push({ outcome: "failed", reasons: [`${result.failureCode}: ${result.message}`] });
  }
  return { ok: false, attempts, artifacts: [], qualitySummary: attempts.at(-1)?.reasons.join("; ") ?? "" };
};

const flyer: UnitAdapter = async (ctx) => {
  const sku = "v2-rtu-flyer";
  const logo = logoForSku(ctx.materials, sku);
  if (logo.held) return { ok: false, attempts: [], artifacts: [], waitingOnSystem: logo.held, qualitySummary: logo.held };
  const offer = ctx.values.offer ?? "";
  const businessName = ctx.facts.businessName || ctx.campaign.campaignName;
  const cta = (ctx.values.cta ?? "").replace(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "").replace(/\s{2,}/g, " ").trim();
  const campaign = viewCampaign(ctx.campaign, sku, {
    flyerPurpose: offer.split(/\n/)[0] ?? offer,
    // The flyer reader treats the first fact line as the business name.
    // Lead with the business so the offer is not mistaken for it.
    // The phone stays on the contact line, not inside the action line.
    mustInclude: [businessName, offer, ctx.values.contact ?? ""].filter(Boolean).join("\n"),
    callToAction: cta || (ctx.values.cta ?? ""),
    styleNotes: ctx.revisionNote ? `Customer change request: ${ctx.revisionNote}` : "",
  });
  const record = extrasDispatchRecord(
    ctx.campaign.campaignId,
    ctx.extraId,
    ctx.unit.unitId,
    sku,
    `${offer}|${ctx.values.cta}|${ctx.values.contact}|${ctx.revisionNote ?? ""}|${ctx.route}`,
  );
  const result = await invokeDesignRendererDispatchHook({
    repoRoot: ctx.repoRoot,
    campaign,
    dispatchRecord: record,
    materials: logo.materials,
    stagedLogoRelativePath: logo.staged,
    preferAnthropic: ctx.route === "primary",
  });
  const loopAttempts = result.internalLoop?.attempts.length ?? 0;
  const tried = ctx.route === "recovery" ? 1 : Math.min(Math.max(loopAttempts, 1), ctx.remainingBudget);
  if (result.ok) {
    return {
      ok: true,
      attempts: [
        ...Array.from({ length: tried - 1 }, () => ({ outcome: "failed" as const, reasons: ["internal correction"] })),
        { outcome: "passed" as const, reasons: [] },
      ],
      artifacts: [
        { path: result.identity.pngRelativePath, label: "Flyer (PNG)", mimeType: "image/png" },
        { path: result.identity.pdfRelativePath, label: "Flyer, printable (PDF)", mimeType: "application/pdf" },
      ],
      qualitySummary: "Passed flyer design QA.",
    };
  }
  const usedPrimary = ctx.route === "recovery" ? 1 : ctx.remainingBudget;
  return {
    ok: false,
    attempts: Array.from({ length: usedPrimary }, () => ({ outcome: "failed" as const, reasons: [`${result.failureCode}: ${result.message}`] })),
    artifacts: [],
    qualitySummary: result.message,
  };
};

function menuItemsToAnswers(items: string): { sections: string; items: string } {
  const lines = items.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const normalized = lines.map((line) => {
    const parts = line.split("|").map((p) => p.trim());
    return parts.length >= 3 ? parts : ["Menu", ...parts];
  });
  const sections = [...new Set(normalized.map((p) => p[0]!))];
  return { sections: sections.join("\n"), items: normalized.map((p) => p.join(" | ")).join("\n") };
}

/** `Name | Description | $Price` or `Name | $Price` → service-sheet `listed` rows. */
function priceListServiceLines(items: string): string {
  return items
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
      const price = parts.at(-1) ?? "";
      const name = parts.length >= 3 ? parts[parts.length - 3]! : parts[0]!;
      const description = parts.length >= 3 ? parts[parts.length - 2]! : "";
      return description ? `${name} | ${description} | listed | ${price}` : `${name} | listed | ${price}`;
    })
    .join("\n");
}

const menuOrPriceList: UnitAdapter = async (ctx) => {
  const priceList = studioExtraMenuKind(ctx.values) === "price_list";
  const sku = priceList ? "v2-rtu-service-sheet" : "v2-rtu-menu";
  const logo = logoForSku(ctx.materials, sku);
  if (logo.held) return { ok: false, attempts: [], artifacts: [], waitingOnSystem: logo.held, qualitySummary: logo.held };
  if (logo.materials.length === 0) {
    return { ok: false, attempts: [], artifacts: [], waitingOnSystem: "The menu and price-list line needs your logo.", qualitySummary: "" };
  }
  const { sections, items } = menuItemsToAnswers(ctx.values.menu_items ?? "");
  const campaign = viewCampaign(ctx.campaign, sku, {
    businessName: ctx.facts.businessName,
    materials: "Customer-supplied item and price list (Studio Extras)",
    ...(priceList
      ? {
          services: priceListServiceLines(ctx.values.menu_items ?? ""),
          contactDetails: ctx.values.contact ?? "",
          wording: ctx.values.menu_notes ?? "",
        }
      : { sections, items, dietaryLabels: ctx.values.menu_notes ?? "" }),
  });
  const attempts: UnitRun["attempts"] = [];
  const tries = ctx.route === "recovery" ? 1 : ctx.remainingBudget;
  for (let i = 0; i < tries; i += 1) {
    const n = ctx.unit.attempts.length + attempts.length + 1;
    const record = extrasDispatchRecord(ctx.campaign.campaignId, ctx.extraId, ctx.unit.unitId, sku, `${items}|${ctx.revisionNote ?? ""}|${n}`);
    const input = { repoRoot: ctx.repoRoot, campaign, dispatchRecord: record, materials: logo.materials, stagedLogoRelativePath: logo.staged };
    const result = priceList ? await invokeServiceSheetDispatchHook(input) : await invokeMenuDispatchHook(input);
    if (result.ok) {
      attempts.push({ outcome: "passed", reasons: [] });
      return {
        ok: true,
        attempts,
        artifacts: [
          { path: result.identity.pngRelativePath, label: priceList ? "Price list (PNG)" : "Menu (PNG)", mimeType: "image/png" },
          { path: result.identity.pdfRelativePath, label: priceList ? "Price list, printable (PDF)" : "Menu, printable (PDF)", mimeType: "application/pdf" },
        ],
        qualitySummary: "Passed design QA with every item and price exactly as supplied.",
      };
    }
    if (result.failureCode === "MISSING_REQUIRED_TRUTH" || result.failureCode === "AMBIGUOUS_CUSTOMER_FACT") {
      return { ok: false, attempts, artifacts: [], waitingOnSystem: result.message, qualitySummary: result.message };
    }
    attempts.push({ outcome: "failed", reasons: [`${result.failureCode}: ${result.message}`] });
  }
  return { ok: false, attempts, artifacts: [], qualitySummary: attempts.at(-1)?.reasons.join("; ") ?? "" };
};

export const studioExtraUnitAdapters: Record<string, UnitAdapter> = {
  "email_and_text:email": emailOrTexts,
  "email_and_text:texts": emailOrTexts,
  "review_request_kit:review-messages": reviewMessages,
  "review_request_kit:review-card": reviewCard,
  "ad_creative:ad-copy": adCopy,
  "ad_creative:ad-graphics": adGraphics,
  "flyer:flyer": flyer,
  "menu_price_list:menu": menuOrPriceList,
};

// ---------------------------------------------------------------------------
// Orchestrator

function now(): string {
  return new Date().toISOString();
}


async function runMeteredAdapter(
  truth: CampaignStudioExtras,
  record: StudioExtraRecord,
  unit: StudioExtraUnit,
  base: Omit<UnitContext, "unit" | "route" | "remainingBudget" | "earlierUnits" | "extraId" | "revisionNote">,
  adapter: UnitAdapter,
  route: "primary" | "recovery",
  remainingBudget: number,
): Promise<{ truth: CampaignStudioExtras; run: UnitRun }> {
  const sequenceBase = (truth.fulfillmentUsage ?? []).filter(
    (line) => line.kind === "provider_usage" && line.extraId === record.id && line.unitId === unit.unitId,
  ).length;
  const collected = await collectProviderCost(() =>
    adapter({
      ...base,
      extraId: record.id,
      revisionNote: record.revisionNote,
      unit,
      route,
      remainingBudget,
      earlierUnits: truth.records.find((item) => item.id === record.id)!.units,
    }),
  );
  const at = now();
  return {
    truth: appendFulfillmentUsage(
      truth,
      fulfillmentLinesFromProviderLedger(collected.ledger, {
        campaignId: base.campaign.campaignId,
        packageId: truth.packageId,
        extraId: record.id,
        selectedExtras: truth.selected,
        unitId: unit.unitId,
        productionLine: unit.productionLine,
        packageRevisionRound: record.lastRevisionRound,
        deliveryState: record.state,
        route,
        at,
        sequenceBase,
      }),
    ),
    run: collected.result,
  };
}

function rememberQualityUsage(
  truth: CampaignStudioExtras,
  record: StudioExtraRecord,
  unit: StudioExtraUnit,
  base: Omit<UnitContext, "unit" | "route" | "remainingBudget" | "earlierUnits" | "extraId" | "revisionNote">,
  route: "primary" | "recovery",
  outcome: "passed" | "below_standard",
): CampaignStudioExtras {
  const live = truth.records.find((item) => item.id === record.id);
  const liveUnit = live?.units.find((item) => item.unitId === unit.unitId);
  return appendFulfillmentUsage(truth, [
    qualityUsageLine(
      {
        campaignId: base.campaign.campaignId,
        packageId: truth.packageId,
        extraId: record.id,
        selectedExtras: truth.selected,
        unitId: unit.unitId,
        productionLine: unit.productionLine,
        packageRevisionRound: record.lastRevisionRound,
        deliveryState: live?.state ?? record.state,
        route,
        at: now(),
        sequenceBase: 0,
      },
      outcome,
      liveUnit?.attempts.length ?? unit.attempts.length,
    ),
  ]);
}

async function produceUnit(
  truth: CampaignStudioExtras,
  record: StudioExtraRecord,
  unit: StudioExtraUnit,
  base: Omit<UnitContext, "unit" | "route" | "remainingBudget" | "earlierUnits" | "extraId" | "revisionNote">,
  adapters: Record<string, UnitAdapter>,
): Promise<{ truth: CampaignStudioExtras; waiting?: string }> {
  const adapter = adapters[`${record.id}:${unit.unitId}`];
  if (!adapter) return { truth, waiting: `No production line for ${record.id}:${unit.unitId}.` };
  const current = () =>
    truth.records.find((r) => r.id === record.id)!.units.find((u) => u.unitId === unit.unitId)!;
  const earlierUnits = () => truth.records.find((r) => r.id === record.id)!.units;

  const primaryUsed = current().attempts.filter((a) => a.route === "primary").length;
  let lastSummary = current().quality.summary ?? "";
  if (primaryUsed < unit.budget) {
    const metered = await runMeteredAdapter(truth, record, current(), base, adapter, "primary", unit.budget - primaryUsed);
    truth = metered.truth;
    const run = metered.run;
    if (run.waitingOnSystem) return { truth, waiting: run.waitingOnSystem };
    for (const attempt of run.attempts) {
      truth = recordStudioExtraAttempt(truth, record.id, unit.unitId, { route: "primary", at: now(), ...attempt });
    }
    if (run.ok) {
      truth = recordStudioExtraQuality(truth, record.id, unit.unitId, { at: now(), outcome: "passed", summary: run.qualitySummary, artifacts: run.artifacts });
      truth = rememberQualityUsage(truth, record, current(), base, "primary", "passed");
      return { truth };
    }
    lastSummary = run.qualitySummary;
  }
  if (current().recovery.available && !current().recovery.attempted) {
    const metered = await runMeteredAdapter(truth, record, current(), base, adapter, "recovery", 1);
    truth = metered.truth;
    const run = metered.run;
    if (run.waitingOnSystem) return { truth, waiting: run.waitingOnSystem };
    const attempt = run.attempts.at(-1) ?? { outcome: "failed" as const, reasons: ["recovery produced nothing"] };
    truth = recordStudioExtraAttempt(truth, record.id, unit.unitId, { route: "recovery", at: now(), ...attempt });
    if (run.ok) {
      truth = recordStudioExtraQuality(truth, record.id, unit.unitId, { at: now(), outcome: "passed", summary: `Approved recovery route: ${run.qualitySummary}`, artifacts: run.artifacts });
      truth = rememberQualityUsage(truth, record, current(), base, "recovery", "passed");
      return { truth };
    }
    lastSummary = run.qualitySummary;
  }
  truth = recordStudioExtraQuality(truth, record.id, unit.unitId, {
    at: now(),
    outcome: "below_standard",
    summary: lastSummary || "Did not reach Studio quality within the required attempts.",
  });
  truth = rememberQualityUsage(truth, record, current(), base, "primary", "below_standard");
  return { truth };
}

/**
 * Advance every selected Extra as far as its inputs allow. Idempotent: units
 * that already passed Quality are not produced again; exhausted Extras stay
 * exhausted.
 */
export async function runStudioExtrasProduction(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  materials: readonly CampaignMaterialItem[];
  adapters?: Partial<Record<string, UnitAdapter>>;
}): Promise<{ truth: CampaignStudioExtras | null; changed: boolean }> {
  ensureStudioExtrasRuntimeEnv(input.repoRoot);
  const initial = input.campaign.studioExtras;
  if (!initial || initial.records.length === 0) return { truth: initial ?? null, changed: false };
  const adapters = { ...studioExtraUnitAdapters, ...(input.adapters ?? {}) } as Record<string, UnitAdapter>;
  const values = studioExtraInputValues(input.campaign, input.materials);
  const facts = studioExtrasPackageFacts(input.campaign, input.materials);
  let truth = refreshStudioExtrasInputs(initial, values, now());

  for (const record of truth.records) {
    const live = truth.records.find((r) => r.id === record.id)!;
    // `in_production` here means an earlier run stopped mid-way; advance() serialises runs per campaign.
    const resumable =
      (live.state === "waiting_on_system" || live.state === "in_production") &&
      live.missingInputs.length === 0;
    if (live.state !== "ready_for_production" && live.state !== "revision_requested" && !resumable) continue;
    if (resumable) {
      truth = { ...truth, records: truth.records.map((r) => (r.id === live.id ? { ...r, state: "ready_for_production" as const } : r)) };
    }
    truth = markStudioExtraInProduction(truth, live.id, now());
    for (const unit of live.units) {
      const fresh = truth.records.find((r) => r.id === live.id)!;
      if (fresh.state === "exhausted") break;
      const freshUnit = fresh.units.find((u) => u.unitId === unit.unitId)!;
      if (freshUnit.quality.outcome !== "pending") continue;
      const produced = await produceUnit(
        truth,
        fresh,
        freshUnit,
        { repoRoot: input.repoRoot, campaign: input.campaign, materials: input.materials, values, facts },
        adapters,
      );
      truth = produced.truth;
      if (produced.waiting) {
        truth = markStudioExtraWaitingOnSystem(truth, live.id, now(), produced.waiting);
        break;
      }
    }
  }
  truth = settleStudioExtrasRevisionRounds(truth, now());
  truth = withStudioExtrasCourtesy(truth, input.campaign, now());
  truth = appendFulfillmentUsage(truth, refundUsageLine(truth, input.campaign.campaignId));
  return { truth, changed: truth !== initial };
}
