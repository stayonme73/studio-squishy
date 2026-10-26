/**
 * Gated live certification for the five Studio Extra types.
 * Does not run unless STUDIO_EXTRAS_FULFILLMENT_CERT=1.
 * Unpaid fixture orders only. Does not call Stripe and does not write the
 * certified Harbor Social or Campaign main-package records.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { CondensedPackageId } from "@/config/studio-customer-journey-condense-v1";
import type { StudioExtraId } from "@/config/studio-extras-v1";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { loadStudioLocalEnv } from "@/lib/studio-production-team-workforce/anthropic-runtime";

import { resolveStudioExtrasCustomerView } from "./customer-view";
import {
  approveAndDeliverReadyStudioExtras,
  initialStudioExtrasTruth,
  requestStudioExtrasChanges,
} from "./machine";
import { runStudioExtrasProduction } from "./production";
import { eligibleStudioExtras } from "./selection";
import type { CampaignStudioExtras, StudioExtraRecord } from "./types";

process.env.PLAYWRIGHT_BROWSERS_PATH = "C:\\Users\\tagia\\AppData\\Local\\ms-playwright";

const ROOT = process.cwd();
const LOGO =
  "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/materials/harbor-oak-anchor-oak-oval-v1.svg";
const PHONE = harborOakIdentityLock.campaign.phone;
const OFFER = harborOakIdentityLock.campaign.offerName;
const DATE = "March 10 – April 15, 2026";
const FACTS = [
  "HVAC tune-up and drain clear for homeowners who want plain, steady service.",
  "$189 (was $249)",
  DATE,
].join("\n");
const CTA = `Book online or call ${PHONE}`;
const PROHIBITED = [...harborOakIdentityLock.campaign.prohibitedOfferAliases];
const PROTECTED = [
  "data/campaigns/harbor-oak-campaign-launch-kit.json",
  "data/campaigns/harbor-oak-social-promo-quality-gate.json",
  "data/campaign-design-artifacts/harbor-oak-campaign-launch-kit",
  "data/campaign-design-artifacts/harbor-oak-social-promo-quality-gate",
];

type ApiCall = {
  host: string;
  status: number;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
};

type ExtraReport = {
  id: StudioExtraId;
  eligibleOnPackage: boolean;
  production: string;
  quality: string;
  revision: string;
  delivery: string;
  units: Array<{
    unitId: string;
    quality: string;
    attempts: number;
    recovery: boolean;
    artifacts: string[];
    filesOnDisk: boolean;
  }>;
  downloadFiles: number;
  usage: { calls: number; inputTokens: number; outputTokens: number; dollarStatus: string[] };
  defect: string | null;
};

function stamp(rel: string): string {
  const abs = path.join(ROOT, rel);
  if (!existsSync(abs)) return "absent";
  const st = statSync(abs);
  if (!st.isDirectory()) return `${st.size}:${Math.floor(st.mtimeMs)}`;
  const rows: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else {
        const file = statSync(child);
        rows.push(`${path.relative(abs, child)}:${file.size}:${Math.floor(file.mtimeMs)}`);
      }
    }
  };
  walk(abs);
  rows.sort();
  return createHash("sha256").update(rows.join("\n")).digest("hex");
}

function textItem(id: string, text: string, kind: CampaignMaterialItem["contentKind"]): CampaignMaterialItem {
  return {
    id,
    category: kind === "url" ? "url-link" : kind === "file-metadata" ? "logo-brand" : "factual-confirmation",
    requirementLevel: "required",
    reviewStatus: "approved_for_use",
    contentKind: kind,
    label: id,
    reason: "Approved Harbor & Oak fixture fact",
    relatedServiceIds: [],
    text: kind === "text" ? text : undefined,
    url: kind === "url" || kind === "file-metadata" ? text : undefined,
    fileName: kind === "file-metadata" ? path.basename(text) : undefined,
    confirmedAt: kind === "confirmation" ? "2026-10-18T16:00:00.000Z" : undefined,
    uploadStatus: kind === "file-metadata" ? "stored" : "none",
    storageRef: null,
  };
}

function materialsFor(extras: readonly StudioExtraId[], contact = PHONE): CampaignMaterialItem[] {
  const items: CampaignMaterialItem[] = [
    textItem("studio-extra-contact", contact, "text"),
    textItem("studio-extra-logo", LOGO, "file-metadata"),
  ];
  if (extras.includes("review_request_kit")) {
    items.push(textItem("studio-extra-review-link", "https://harborandoak.example/review", "url"));
    items.push(textItem("studio-extra-text-consent", "yes", "confirmation"));
  }
  if (extras.includes("email_and_text")) {
    items.push(textItem("studio-extra-text-consent", "yes", "confirmation"));
  }
  if (extras.includes("menu_price_list")) {
    items.push(textItem("studio-extra-menu-kind", "price list", "text"));
    items.push(
      textItem(
        "studio-extra-menu-items",
        `Services | ${OFFER} | HVAC tune-up and drain clear for homeowners who want plain, steady service. | $189`,
        "text",
      ),
    );
    items.push(textItem("studio-extra-menu-notes", DATE, "text"));
  }
  return items;
}

function fixtureCampaign(
  campaignId: string,
  packageId: CondensedPackageId,
  extras: readonly StudioExtraId[],
  priceCents: number,
): CampaignRecord {
  const answers = {
    [`${packageId}:purpose`]: OFFER,
    [`${packageId}:facts`]: FACTS,
    [`${packageId}:cta`]: CTA,
    [`${packageId}:mustKeep`]: "Spring service you can trust",
    [`${packageId}:mustNot`]: PROHIBITED.join("; "),
  };
  return {
    campaignId,
    campaignName: harborOakIdentityLock.businessName,
    revisionRoundsIncluded: 3,
    revisionRoundsIncludedSource: "package_snapshot",
    condensedOffer: {
      packageId,
      name: packageId,
      priceCents,
      revisionRounds: 3,
      customerName: "Harbor Oak",
      customerEmail: "unclaimed@studio.local",
      company: harborOakIdentityLock.businessName,
      projectNeed: OFFER,
      materialsNote: "",
      support: {},
      extras: [...extras],
    },
    routeMapIntake: { submittedAt: "2026-10-18T16:00:00.000Z", answers },
    studioExtras: initialStudioExtrasTruth(packageId, extras, "2026-10-18T16:00:00.000Z"),
  } as unknown as CampaignRecord;
}

function installMeter(): { calls: ApiCall[]; restore: () => void } {
  const calls: ApiCall[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const response = await original(input, init);
    try {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const host = new URL(raw).hostname;
      if (host === "api.anthropic.com" || host.endsWith("openai.com")) {
        const data = (await response.clone().json().catch(() => null)) as {
          model?: string;
          usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
        } | null;
        calls.push({
          host,
          status: response.status,
          model: typeof data?.model === "string" ? data.model : null,
          inputTokens: data?.usage?.input_tokens ?? data?.usage?.prompt_tokens ?? 0,
          outputTokens: data?.usage?.output_tokens ?? data?.usage?.completion_tokens ?? 0,
        });
      }
    } catch {
      // Measurement must not change the provider call.
    }
    return response;
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

function usageFor(truth: CampaignStudioExtras, id: StudioExtraId) {
  const lines = (truth.fulfillmentUsage ?? []).filter((line) => line.kind === "provider_usage" && line.extraId === id);
  return {
    calls: lines.length,
    inputTokens: lines.reduce((sum, line) => sum + line.usage.textInputTokens + line.usage.imageInputTokens, 0),
    outputTokens: lines.reduce((sum, line) => sum + line.usage.textOutputTokens + line.usage.imageOutputTokens, 0),
    dollarStatus: [...new Set(lines.map((line) => line.dollarStatus))],
  };
}

function leakedPhrases(campaignId: string): string[] {
  const root = path.join(ROOT, "data", "campaign-design-artifacts", campaignId);
  if (!existsSync(root)) return [];
  const hits = new Set<string>();
  const needles = [...PROHIBITED, "CERTIFICATION FIXTURE", "INTERNAL TEST", "Richmond"];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
        else if (/\.(txt|html)$/i.test(entry.name) && statSync(child).size <= 2_000_000) {
        const text = readFileSync(child).toString("utf8");
        for (const needle of needles) {
          if (text.includes(needle)) hits.add(needle);
        }
      }
    }
  };
  walk(root);
  return [...hits];
}

function extraReport(
  truth: CampaignStudioExtras,
  record: StudioExtraRecord,
  packageId: CondensedPackageId,
  downloads: number,
): ExtraReport {
  const round = (truth.revisionRounds ?? []).find((item) => item.extraIds.includes(record.id));
  const qualityPassed = record.units.every((unit) => unit.quality.outcome === "passed");
  const filesOnDisk = record.units.every((unit) =>
    unit.artifacts.every((artifact) => existsSync(path.join(ROOT, artifact.path))),
  );
  return {
    id: record.id,
    eligibleOnPackage: eligibleStudioExtras(packageId).includes(record.id),
    production: record.units.some((unit) => unit.artifacts.length > 0) ? "produced" : record.state,
    quality: qualityPassed
      ? "passed"
      : record.units
          .map((unit) => `${unit.unitId}:${unit.quality.outcome}${unit.quality.summary ? ` (${unit.quality.summary})` : ""}`)
          .join(", "),
    revision: round?.reachedReviewAt ? `in-scope round reached review (${record.revisionNote ?? ""})` : record.revisionNote ?? "not reached",
    delivery: record.state === "delivered" && downloads > 0 ? "released" : record.state,
    units: record.units.map((unit) => ({
      unitId: unit.unitId,
      quality: unit.quality.outcome,
      attempts: unit.attempts.length,
      recovery: unit.recovery.attempted,
      artifacts: unit.artifacts.map((artifact) => artifact.path),
      filesOnDisk: unit.artifacts.every((artifact) => existsSync(path.join(ROOT, artifact.path))),
    })),
    downloadFiles: downloads,
    usage: usageFor(truth, record.id),
    defect: qualityPassed && record.state === "delivered" && filesOnDisk && downloads > 0 && round?.reachedReviewAt
      ? null
      : `state=${record.state}; quality=${qualityPassed}; files=${filesOnDisk}; downloads=${downloads}; revision=${Boolean(round?.reachedReviewAt)}`,
  };
}

async function certifyFixture(input: {
  campaignId: string;
  packageId: CondensedPackageId;
  extras: readonly StudioExtraId[];
  priceCents: number;
  notes: Record<string, string>;
  contact?: string;
}): Promise<{ extras: ExtraReport[]; error: string | null; courtesy: string | null }> {
  const eligible = eligibleStudioExtras(input.packageId);
  const blocked = input.extras.filter((id) => !eligible.includes(id));
  if (!process.env.ANTHROPIC_API_KEY?.trim()) loadStudioLocalEnv(ROOT);
  if (blocked.length > 0) {
    return {
      extras: [],
      error: `${blocked.join(", ")} is not an eligible Extra on ${input.packageId}`,
      courtesy: null,
    };
  }
  let campaign = fixtureCampaign(input.campaignId, input.packageId, input.extras, input.priceCents);
  const materials = materialsFor(input.extras, input.contact);
  const first = await runStudioExtrasProduction({ repoRoot: ROOT, campaign, materials });
  if (!first.truth) return { extras: [], error: "production returned no extras truth", courtesy: null };
  campaign = { ...campaign, studioExtras: first.truth };
  const open = first.truth.records.every((record) => record.state === "ready_for_review");
  if (!open) {
    return {
      extras: first.truth.records.map((record) => extraReport(first.truth!, record, input.packageId, 0)),
      error: first.truth.records
        .filter((record) => record.state !== "ready_for_review")
        .map((record) => `${record.id} stopped at ${record.state}: ${record.history.at(-1)?.detail ?? ""} ${record.units.map((unit) => unit.quality.summary ?? unit.quality.outcome).join(" | ")}`)
        .join("\n"),
      courtesy: first.truth.courtesy?.status ?? null,
    };
  }
  const changed = requestStudioExtrasChanges(
    first.truth,
    input.extras.map((id) => ({ id, note: input.notes[id] ?? "" })),
    { at: "2026-10-18T16:30:00.000Z", packageRound: 1, ridesPackageRevision: false },
  );
  if (!changed.ok) return { extras: [], error: changed.error, courtesy: first.truth.courtesy?.status ?? null };
  campaign = { ...campaign, studioExtras: changed.truth };
  const second = await runStudioExtrasProduction({ repoRoot: ROOT, campaign, materials });
  if (!second.truth) return { extras: [], error: "revision production returned no extras truth", courtesy: null };
  const leaks = leakedPhrases(input.campaignId);
  const delivered = approveAndDeliverReadyStudioExtras(second.truth, "2026-10-18T17:00:00.000Z");
  campaign = { ...campaign, studioExtras: delivered.truth };
  const view = await resolveStudioExtrasCustomerView(campaign, ROOT);
  const extras = delivered.truth.records.map((record) => {
    const downloads = view?.extras.find((item) => item.id === record.id)?.files.length ?? 0;
    const report = extraReport(delivered.truth, record, input.packageId, downloads);
    if (leaks.length > 0) report.defect = `prohibited or fixture-label text in artifacts: ${leaks.join(", ")}`;
    return report;
  });
  return {
    extras,
    error: extras.some((item) => item.defect) || leaks.length > 0 ? leaks.join(", ") || "see extra defects" : null,
    courtesy: delivered.truth.courtesy?.status ?? null,
  };
}

describe.skipIf(process.env.STUDIO_EXTRAS_FULFILLMENT_CERT !== "1")(
  "Studio Extras fulfillment certification",
  () => {
    it(
      "produces, checks, revises, and releases the five Extra types on three unpaid fixtures",
      async () => {
        delete process.env.ANTHROPIC_API_KEY;
        loadStudioLocalEnv(ROOT);
        expect(process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-")).toBe(true);
        expect(existsSync(path.join(ROOT, LOGO))).toBe(true);
        const before = Object.fromEntries(PROTECTED.map((rel) => [rel, stamp(rel)]));
        const meter = installMeter();
        const started = Date.now();
        const only = (process.env.STUDIO_EXTRAS_FULFILLMENT_CERT_ONLY ?? "").trim();
        const fixtures = [
          {
            name: "clip",
            campaignId: "extras-fulfillment-cert-clip-11",
            packageId: "clip_repurposing" as const,
            extras: ["ad_creative", "flyer"] as const,
            priceCents: 37375,
            contact: `${PHONE} · harborandoak.example/book-tuneup`,
            notes: {
              ad_creative: `Make the date ${DATE} easier to see. Keep $189.`,
              flyer: `Put ${PHONE} on its own line. Keep $189.`,
            },
          },
          {
            name: "social",
            campaignId: "extras-fulfillment-cert-social-2",
            packageId: "social_and_promo_graphics" as const,
            extras: ["review_request_kit", "email_and_text"] as const,
            priceCents: 19900,
            notes: {
              review_request_kit: "Keep the review link exactly and shorten the thank-you.",
              email_and_text: "Keep $189 and make the email subject shorter.",
            },
          },
          {
            name: "campaign",
            campaignId: "extras-fulfillment-cert-campaign-2",
            packageId: "campaign_launch_kit" as const,
            extras: ["menu_price_list"] as const,
            priceCents: 34900,
            notes: {
              menu_price_list: `Keep $189 and make ${OFFER} easier to read.`,
            },
          },
        ];
        const selected = only ? fixtures.filter((fixture) => fixture.name === only) : fixtures;
        const results = [];
        for (const fixture of selected) {
          try {
            results.push({ fixture: fixture.name, ...(await certifyFixture(fixture)) });
          } catch (error) {
            results.push({
              fixture: fixture.name,
              extras: [],
              error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
              courtesy: null,
            });
          }
        }
        meter.restore();
        const after = Object.fromEntries(PROTECTED.map((rel) => [rel, stamp(rel)]));
        const protectedUnchanged = PROTECTED.every((rel) => before[rel] === after[rel]);
        const report = {
          at: new Date().toISOString(),
          elapsedMs: Date.now() - started,
          unpaid: true,
          stripeCalled: meter.calls.some((call) => call.host.includes("stripe")),
          protectedUnchanged,
          protected: PROTECTED.map((rel) => ({ rel, before: before[rel], after: after[rel] })),
          apiCalls: meter.calls,
          fixtures: results,
          gaps: [
            "Short-Form Video Editing was not run. It shares Clip's Extra eligibility.",
            "Ad Creative was run on Clip only. It is not an eligible Extra on Social or Campaign Launch Kit.",
            "Flyer was run on Clip only. It is also eligible on Social and Short-Form, and it is already inside Campaign Launch Kit rather than a separate Extra.",
            "Review Request Kit and Email + Text were run on Social only. Both are also eligible on Clip and Short-Form. Email + Text is already inside Campaign Launch Kit.",
            "Menu / Price List was run on Campaign as a price list, using the approved Harbor service line. The food-menu mode of the same Extra was not run. The Extra is also eligible on Social.",
            "Menu / Price List contact is the approved phone only. The service-sheet customer mapper refuses harborandoak.example as certification-fixture leakage, so that website is not printed on the price list.",
            "A flyer whose only contact line is a phone leaves the contact band below the 40% fill floor. This Clip flyer also carries the approved website.",
          ],
        };
        const out = path.join(ROOT, "data", "extras-fulfillment-cert", "report.json");
        mkdirSync(path.dirname(out), { recursive: true });
        writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
        console.log(JSON.stringify(report, null, 2));
        expect(protectedUnchanged).toBe(true);
        expect(report.stripeCalled).toBe(false);
        expect(results.every((result) => result.error == null && result.extras.every((extra) => extra.defect == null))).toBe(true);
      },
      45 * 60 * 1000,
    );
  },
);
