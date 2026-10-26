/**
 * Remaining Extras coverage. Live runs only when STUDIO_EXTRAS_COVERAGE_CERT=1.
 * Unpaid sandbox orders. Machine advances production. No Stripe session.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  socialAndPromoGraphicsPackageDetail,
} from "@/config/studio-customer-journey-condense-v1";
import { studioExtrasEligibilityByPackage } from "@/config/studio-extras-v1";
import { harborOakIdentityLock, saltCedarIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { loadStudioLocalEnv } from "@/lib/studio-production-team-workforce/anthropic-runtime";
import {
  buildSmallMenuSections,
  ensureSaltCedarMenuLogoMaterial,
} from "@/lib/studio-design-renderer/menu-fixtures";

import { advanceStudioExtras } from "./advance";
import { resolveStudioExtrasCustomerView } from "./customer-view";
import {
  approveAndDeliverReadyStudioExtras,
  initialStudioExtrasTruth,
  requestStudioExtrasChanges,
} from "./machine";
import type { StudioExtraId } from "./types";

process.env.PLAYWRIGHT_BROWSERS_PATH = "C:\\Users\\tagia\\AppData\\Local\\ms-playwright";

const ROOT = process.cwd();
const HARBOR_LOGO =
  "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/materials/harbor-oak-anchor-oak-oval-v1.svg";
const PHONE = harborOakIdentityLock.campaign.phone;
const OFFER = harborOakIdentityLock.campaign.offerName;
const DATE = "March 10 – April 15, 2026";
const DESCRIPTION = "HVAC tune-up and drain clear for homeowners who want plain, steady service.";
const DIETARY =
  "Contains wheat, dairy, eggs, tree nuts, and soy in various items. Ask staff about allergens — customer-verified wording.";
const PROTECTED = [
  "data/campaigns/harbor-oak-campaign-launch-kit.json",
  "data/campaigns/harbor-oak-social-promo-quality-gate.json",
  "data/campaign-design-artifacts/harbor-oak-campaign-launch-kit",
  "data/campaign-design-artifacts/harbor-oak-social-promo-quality-gate",
];

function stamp(rel: string): string {
  const abs = path.join(ROOT, rel);
  if (!existsSync(abs)) return "absent";
  const st = statSync(abs);
  if (!st.isDirectory()) return `${st.size}:${Math.floor(st.mtimeMs)}`;
  const rows: string[] = [];
  const walk = (dir: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === "locks") continue;
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
    category: kind === "file-metadata" ? "logo-brand" : "factual-confirmation",
    requirementLevel: "required",
    reviewStatus: "approved_for_use",
    contentKind: kind,
    label: id,
    reason: "Approved fixture fact",
    relatedServiceIds: [],
    text: kind === "text" ? text : undefined,
    url: kind === "file-metadata" ? text : undefined,
    fileName: kind === "file-metadata" ? path.basename(text) : undefined,
    uploadStatus: kind === "file-metadata" ? "stored" : "none",
    storageRef: null,
  };
}

function customerText(campaignId: string): string {
  const root = path.join(ROOT, "data", "campaign-design-artifacts", campaignId);
  if (!existsSync(root)) return "";
  const parts: string[] = [];
  const walk = (dir: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === "locks") continue;
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (/\.(html|txt)$/i.test(entry.name)) parts.push(readFileSync(child, "utf8"));
    }
  };
  walk(root);
  return parts.join("\n");
}

function unpaidCampaign(input: {
  campaignId: string;
  company: string;
  extras: readonly StudioExtraId[];
  purpose: string;
  facts: string;
  cta: string;
}): CampaignRecord {
  const now = "2026-10-18T18:00:00.000Z";
  return {
    campaignId: input.campaignId,
    campaignName: input.company,
    revisionRoundsIncluded: 3,
    revisionRoundsIncludedSource: "package_snapshot",
    condensedOffer: {
      packageId: "social_and_promo_graphics",
      name: socialAndPromoGraphicsPackageDetail.name,
      priceCents: socialAndPromoGraphicsPackageDetail.priceCents,
      revisionRounds: 3,
      customerName: "Fixture Customer",
      customerEmail: "unclaimed@studio.local",
      company: input.company,
      projectNeed: input.purpose,
      materialsNote: "",
      support: {},
      extras: [...input.extras],
    },
    routeMapIntake: {
      submittedAt: now,
      answers: {
        "social_and_promo_graphics:purpose": input.purpose,
        "social_and_promo_graphics:facts": input.facts,
        "social_and_promo_graphics:cta": input.cta,
      },
    },
    studioExtras: initialStudioExtrasTruth("social_and_promo_graphics", input.extras, now),
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      sandbox: true,
      currency: "usd",
      expectedAmountCents: 0,
      confirmedAmountCents: 0,
      selectedServiceIds: [],
      decisionId: `${input.campaignId}-unpaid`,
      factFingerprint: `${input.campaignId}-unpaid`,
      draftRevision: 1,
      confirmedAt: now,
    },
  } as unknown as CampaignRecord;
}

describe("Extras coverage contracts", () => {
  it("treats Short-Form as the same Extra contract as Clip, and keeps Campaign inclusions out of the Extra list", () => {
    expect(studioExtrasEligibilityByPackage.short_form_video_editing).toEqual(
      studioExtrasEligibilityByPackage.clip_repurposing,
    );
    expect(studioExtrasEligibilityByPackage.social_and_promo_graphics).toEqual([
      "review_request_kit",
      "email_and_text",
      "flyer",
      "menu_price_list",
    ]);
    expect(studioExtrasEligibilityByPackage.campaign_launch_kit).toEqual([
      "review_request_kit",
      "menu_price_list",
    ]);
    expect(socialAndPromoGraphicsPackageDetail.priceCents).toBe(19900);
  });
});

describe.skipIf(process.env.STUDIO_EXTRAS_COVERAGE_CERT !== "1")(
  "remaining Extras coverage through Machine",
  () => {
    const calls: Array<{ inputTokens: number; outputTokens: number; status: number }> = [];
    const original = globalThis.fetch;

    it(
      "releases a factual Salt & Cedar food menu",
      async () => {
        delete process.env.ANTHROPIC_API_KEY;
        loadStudioLocalEnv(ROOT);
        expect(process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-")).toBe(true);
        const before = Object.fromEntries(PROTECTED.map((rel) => [rel, stamp(rel)]));
        globalThis.fetch = async (input, init) => {
          const response = await original(input, init);
          try {
            const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            if (new URL(raw).hostname === "api.anthropic.com") {
              const data = (await response.clone().json().catch(() => null)) as {
                usage?: { input_tokens?: number; output_tokens?: number };
              } | null;
              calls.push({
                status: response.status,
                inputTokens: data?.usage?.input_tokens ?? 0,
                outputTokens: data?.usage?.output_tokens ?? 0,
              });
            }
          } catch {
            // Measurement must not change the provider call.
          }
          return response;
        };
        const logo = ensureSaltCedarMenuLogoMaterial(ROOT);
        const items = buildSmallMenuSections()
          .flatMap((section) =>
            section.items.map(
              (item) =>
                `${section.title} | ${item.name} | ${item.description} | ${item.priceDisplay}`,
            ),
          )
          .join("\n");
        const campaignId = "extras-coverage-food-menu-1";
        const campaign = unpaidCampaign({
          campaignId,
          company: saltCedarIdentityLock.businessName,
          extras: ["menu_price_list"],
          purpose: saltCedarIdentityLock.campaign.offerName,
          facts: "Coffee and one pastry.",
          cta: "Visit the bakery",
        });
        try {
          await upsertCampaignRecord(campaign);
          await writeMaterialsEnvelope({
            campaignId,
            items: [
              textItem("studio-extra-logo", logo.relativePath, "file-metadata"),
              textItem("studio-extra-menu-kind", "menu", "text"),
              textItem("studio-extra-menu-items", items, "text"),
              textItem("studio-extra-menu-notes", DIETARY, "text"),
            ],
            updatedAt: "2026-10-18T18:00:00.000Z",
            version: 1,
            syncedAt: "2026-10-18T18:00:00.000Z",
          });
          const produced = await advanceStudioExtras(campaign);
          const first = produced.studioExtras?.records.find((record) => record.id === "menu_price_list");
          expect(first?.state, first?.units.map((unit) => unit.quality.summary).join(" | ")).toBe("ready_for_review");
          const changed = requestStudioExtrasChanges(
            produced.studioExtras!,
            [{ id: "menu_price_list", note: "Keep $3.75 and make Butter Croissant easier to read." }],
            { at: "2026-10-18T18:10:00.000Z", packageRound: 1, ridesPackageRevision: false },
          );
          expect(changed.ok).toBe(true);
          if (!changed.ok) return;
          await upsertCampaignRecord({ ...produced, studioExtras: changed.truth, updatedAt: "2026-10-18T18:10:00.000Z" });
          const revised = await advanceStudioExtras({ ...produced, studioExtras: changed.truth });
          const second = revised.studioExtras?.records.find((record) => record.id === "menu_price_list");
          expect(second?.state, second?.units.map((unit) => unit.quality.summary).join(" | ")).toBe("ready_for_review");
          const delivered = approveAndDeliverReadyStudioExtras(revised.studioExtras!, "2026-10-18T18:20:00.000Z");
          const saved = { ...revised, studioExtras: delivered.truth };
          await upsertCampaignRecord({ ...saved, updatedAt: "2026-10-18T18:20:00.000Z" });
          const view = await resolveStudioExtrasCustomerView(saved, ROOT);
          const visible = customerText(campaignId);
          const report = {
            scenario: "food-menu",
            state: delivered.truth.records[0]?.state,
            downloads: view?.extras[0]?.files.length ?? 0,
            courtesy: delivered.truth.courtesy?.status ?? null,
            history: delivered.truth.records[0]?.history.map((entry) => entry.event),
            quality: second?.units.map((unit) => unit.quality.outcome),
            hasCroissant: visible.includes("Butter Croissant"),
            hasPrice: visible.includes("$3.75"),
            hasLatte: visible.includes("Cafe Latte"),
            hasDietary: visible.includes("Ask staff about allergens"),
            inventedSite: /saltandcedar\.example|https?:\/\//i.test(visible),
            inventedClaim: /healthiest bakery|gluten-free miracle/i.test(visible),
          };
          console.log(JSON.stringify(report, null, 2));
          expect(report.state).toBe("delivered");
          expect(report.downloads).toBeGreaterThan(0);
          expect(report.courtesy).toBe("not_eligible");
          expect(report.hasCroissant).toBe(true);
          expect(report.hasPrice).toBe(true);
          expect(report.hasLatte).toBe(true);
          expect(report.hasDietary).toBe(true);
          expect(report.inventedSite).toBe(false);
          expect(report.inventedClaim).toBe(false);
          for (const rel of PROTECTED) expect(stamp(rel)).toBe(before[rel]);
        } finally {
          globalThis.fetch = original;
        }
      },
      10 * 60 * 1000,
    );

    it(
      "releases a phone-only Harbor flyer without inventing a website",
      async () => {
        delete process.env.ANTHROPIC_API_KEY;
        loadStudioLocalEnv(ROOT);
        const before = Object.fromEntries(PROTECTED.map((rel) => [rel, stamp(rel)]));
        globalThis.fetch = async (input, init) => {
          const response = await original(input, init);
          try {
            const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            if (new URL(raw).hostname === "api.anthropic.com") {
              const data = (await response.clone().json().catch(() => null)) as {
                usage?: { input_tokens?: number; output_tokens?: number };
              } | null;
              calls.push({
                status: response.status,
                inputTokens: data?.usage?.input_tokens ?? 0,
                outputTokens: data?.usage?.output_tokens ?? 0,
              });
            }
          } catch {
            // Measurement must not change the provider call.
          }
          return response;
        };
        const campaignId = "extras-coverage-phone-flyer-2";
        const campaign = unpaidCampaign({
          campaignId,
          company: harborOakIdentityLock.businessName,
          extras: ["flyer"],
          purpose: OFFER,
          facts: [DESCRIPTION, "$189 (was $249)", DATE].join("\n"),
          cta: `Call ${PHONE}`,
        });
        try {
          await upsertCampaignRecord(campaign);
          await writeMaterialsEnvelope({
            campaignId,
            items: [
              textItem("studio-extra-contact", PHONE, "text"),
              textItem("studio-extra-logo", HARBOR_LOGO, "file-metadata"),
            ],
            updatedAt: "2026-10-18T18:00:00.000Z",
            version: 1,
            syncedAt: "2026-10-18T18:00:00.000Z",
          });
          const produced = await advanceStudioExtras(campaign);
          const first = produced.studioExtras?.records.find((record) => record.id === "flyer");
          expect(first?.state, first?.units.map((unit) => unit.quality.summary).join(" | ")).toBe("ready_for_review");
          const changed = requestStudioExtrasChanges(
            produced.studioExtras!,
            [{ id: "flyer", note: `Put ${PHONE} on its own line. Keep $189.` }],
            { at: "2026-10-18T18:30:00.000Z", packageRound: 1, ridesPackageRevision: false },
          );
          expect(changed.ok).toBe(true);
          if (!changed.ok) return;
          await upsertCampaignRecord({ ...produced, studioExtras: changed.truth, updatedAt: "2026-10-18T18:30:00.000Z" });
          const revised = await advanceStudioExtras({ ...produced, studioExtras: changed.truth });
          const second = revised.studioExtras?.records.find((record) => record.id === "flyer");
          expect(second?.state, second?.units.map((unit) => unit.quality.summary).join(" | ")).toBe("ready_for_review");
          const delivered = approveAndDeliverReadyStudioExtras(revised.studioExtras!, "2026-10-18T18:40:00.000Z");
          const saved = { ...revised, studioExtras: delivered.truth };
          await upsertCampaignRecord({ ...saved, updatedAt: "2026-10-18T18:40:00.000Z" });
          const view = await resolveStudioExtrasCustomerView(saved, ROOT);
          const visible = customerText(campaignId);
          const report = {
            scenario: "phone-only-flyer",
            state: delivered.truth.records[0]?.state,
            downloads: view?.extras[0]?.files.length ?? 0,
            courtesy: delivered.truth.courtesy?.status ?? null,
            history: delivered.truth.records[0]?.history.map((entry) => entry.event),
            quality: second?.units.map((unit) => unit.quality.outcome),
            hasPhone: visible.includes(PHONE),
            hasOffer: visible.includes(OFFER),
            hasPrice: visible.includes("$189"),
            inventedSite: /harborandoak\.example|https?:\/\/|www\./i.test(visible),
            apiCalls: calls,
          };
          console.log(JSON.stringify(report, null, 2));
          expect(report.state).toBe("delivered");
          expect(report.downloads).toBeGreaterThan(0);
          expect(report.courtesy).toBe("not_eligible");
          expect(report.hasPhone).toBe(true);
          expect(report.hasOffer).toBe(true);
          expect(report.hasPrice).toBe(true);
          expect(report.inventedSite).toBe(false);
          for (const rel of PROTECTED) expect(stamp(rel)).toBe(before[rel]);
        } finally {
          globalThis.fetch = original;
        }
      },
      10 * 60 * 1000,
    );
  },
);
