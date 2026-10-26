/**
 * Gated Menu / Price List factual-accuracy retest.
 * Runs only when STUDIO_MENU_PRICE_LIST_FACTS_CERT=1.
 * Unpaid sandbox order. Machine advances production. No Stripe session.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { loadStudioLocalEnv } from "@/lib/studio-production-team-workforce/anthropic-runtime";

import { advanceStudioExtras } from "./advance";
import { resolveStudioExtrasCustomerView } from "./customer-view";
import {
  approveAndDeliverReadyStudioExtras,
  initialStudioExtrasTruth,
  requestStudioExtrasChanges,
} from "./machine";

process.env.PLAYWRIGHT_BROWSERS_PATH = "C:\\Users\\tagia\\AppData\\Local\\ms-playwright";

const ROOT = process.cwd();
const CAMPAIGN_ID = "extras-factual-accuracy-menu-1";
const LOGO =
  "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/materials/harbor-oak-anchor-oak-oval-v1.svg";
const PHONE = harborOakIdentityLock.campaign.phone;
const OFFER = harborOakIdentityLock.campaign.offerName;
const DATE = "March 10 – April 15, 2026";
const DESCRIPTION = "HVAC tune-up and drain clear for homeowners who want plain, steady service.";
const UNSUPPORTED = ["Professional Home Care You Can Trust", "Comprehensive inspection & cleaning"];
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
    category: kind === "file-metadata" ? "logo-brand" : "factual-confirmation",
    requirementLevel: "required",
    reviewStatus: "approved_for_use",
    contentKind: kind,
    label: id,
    reason: "Approved Harbor & Oak fixture fact",
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
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (/\.(html|txt)$/i.test(entry.name)) parts.push(readFileSync(child, "utf8"));
    }
  };
  walk(root);
  return parts.join("\n");
}

describe.skipIf(process.env.STUDIO_MENU_PRICE_LIST_FACTS_CERT !== "1")(
  "Menu / Price List factual accuracy through Machine",
  () => {
    it(
      "releases only approved Harbor facts after production, revision, and Quality",
      async () => {
        delete process.env.ANTHROPIC_API_KEY;
        loadStudioLocalEnv(ROOT);
        expect(process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-")).toBe(true);
        const before = Object.fromEntries(PROTECTED.map((rel) => [rel, stamp(rel)]));
        const calls: Array<{ inputTokens: number; outputTokens: number; status: number }> = [];
        const original = globalThis.fetch;
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

        const now = "2026-10-18T17:40:00.000Z";
        const campaign = {
          campaignId: CAMPAIGN_ID,
          campaignName: harborOakIdentityLock.businessName,
          revisionRoundsIncluded: 3,
          revisionRoundsIncludedSource: "package_snapshot",
          condensedOffer: {
            packageId: "campaign_launch_kit",
            name: "Campaign Launch Kit",
            priceCents: 34900,
            revisionRounds: 3,
            customerName: "Harbor Oak",
            customerEmail: "unclaimed@studio.local",
            company: harborOakIdentityLock.businessName,
            projectNeed: OFFER,
            materialsNote: "",
            support: {},
            extras: ["menu_price_list"],
          },
          routeMapIntake: {
            submittedAt: now,
            answers: {
              "campaign_launch_kit:purpose": OFFER,
              "campaign_launch_kit:facts": [DESCRIPTION, "$189 (was $249)", DATE].join("\n"),
              "campaign_launch_kit:cta": `Book online or call ${PHONE}`,
              "campaign_launch_kit:mustKeep": "Spring service you can trust",
            },
          },
          studioExtras: initialStudioExtrasTruth("campaign_launch_kit", ["menu_price_list"], now),
          paymentTruth: {
            processor: "stripe",
            status: "confirmed",
            sandbox: true,
            currency: "usd",
            expectedAmountCents: 0,
            confirmedAmountCents: 0,
            selectedServiceIds: [],
            decisionId: "extras-factual-accuracy-unpaid",
            factFingerprint: "extras-factual-accuracy-unpaid",
            draftRevision: 1,
            confirmedAt: now,
          },
        } as unknown as CampaignRecord;

        try {
          await upsertCampaignRecord(campaign);
          await writeMaterialsEnvelope({
            campaignId: CAMPAIGN_ID,
            items: [
              textItem("studio-extra-contact", PHONE, "text"),
              textItem("studio-extra-logo", LOGO, "file-metadata"),
              textItem("studio-extra-menu-kind", "price list", "text"),
              textItem(
                "studio-extra-menu-items",
                `Services | ${OFFER} | ${DESCRIPTION} | $189`,
                "text",
              ),
              textItem("studio-extra-menu-notes", DATE, "text"),
            ],
            updatedAt: now,
            version: 1,
            syncedAt: now,
          });

          const produced = await advanceStudioExtras(campaign);
          const first = produced.studioExtras?.records.find((record) => record.id === "menu_price_list");
          expect(first?.state, first?.history.at(-1)?.detail ?? first?.state).toBe("ready_for_review");
          expect(first?.units.every((unit) => unit.quality.outcome === "passed")).toBe(true);

          const changed = requestStudioExtrasChanges(
            produced.studioExtras!,
            [{ id: "menu_price_list", note: `Keep $189 and make ${OFFER} easier to read.` }],
            { at: "2026-10-18T17:45:00.000Z", packageRound: 1, ridesPackageRevision: false },
          );
          expect(changed.ok).toBe(true);
          if (!changed.ok) return;
          await upsertCampaignRecord({
            ...produced,
            studioExtras: changed.truth,
            updatedAt: "2026-10-18T17:45:00.000Z",
          });
          const revised = await advanceStudioExtras({
            ...produced,
            studioExtras: changed.truth,
          });
          const second = revised.studioExtras?.records.find((record) => record.id === "menu_price_list");
          expect(second?.state, second?.units.map((unit) => unit.quality.summary).join(" | ")).toBe("ready_for_review");

          const delivered = approveAndDeliverReadyStudioExtras(revised.studioExtras!, "2026-10-18T17:50:00.000Z");
          await upsertCampaignRecord({
            ...revised,
            studioExtras: delivered.truth,
            updatedAt: "2026-10-18T17:50:00.000Z",
          });
          const saved = {
            ...revised,
            studioExtras: delivered.truth,
          };
          const view = await resolveStudioExtrasCustomerView(saved, ROOT);
          const downloads = view?.extras.find((item) => item.id === "menu_price_list")?.files.length ?? 0;
          const visible = customerText(CAMPAIGN_ID);
          const report = {
            state: delivered.truth.records[0]?.state,
            downloads,
            courtesy: delivered.truth.courtesy?.status ?? null,
            apiCalls: calls,
            unsupportedHits: UNSUPPORTED.filter((phrase) => visible.includes(phrase)),
            hasOffer: visible.includes(OFFER),
            hasPrice: visible.includes("$189"),
            hasPhone: visible.includes(PHONE),
            hasDescription: visible.includes(DESCRIPTION),
            stripeCalled: calls.some(() => false) || visible.includes("checkout.stripe.com"),
          };
          console.log(JSON.stringify(report, null, 2));
          expect(report.unsupportedHits).toEqual([]);
          expect(report.hasOffer).toBe(true);
          expect(report.hasPrice).toBe(true);
          expect(report.hasPhone).toBe(true);
          expect(report.hasDescription).toBe(true);
          expect(downloads).toBeGreaterThan(0);
          expect(report.state).toBe("delivered");
          expect(report.courtesy).toBe("not_eligible");
          for (const rel of PROTECTED) expect(stamp(rel)).toBe(before[rel]);
        } finally {
          globalThis.fetch = original;
        }
      },
      10 * 60 * 1000,
    );
  },
);
