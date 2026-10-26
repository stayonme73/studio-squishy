import { readFileSync, readdirSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";
import {
  getOrInitializeMaterials,
  writeMaterialsEnvelope,
} from "@/lib/materials/store";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";
import { socialPromoParentProductionState } from "@/lib/studio-dispatch/social-promo-composite-dispatch";
import { readProductionTeamLog } from "@/lib/studio-production-team-workforce";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= "C:\\Users\\tagia\\AppData\\Local\\ms-playwright";
const CAMPAIGN_ID = "harbor-oak-social-promo-quality-gate";
const LOGO =
  "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/materials/harbor-oak-anchor-oak-oval-v1.svg";
const SOURCE = "route-proof-social-promo-1791620985041";

function harborCampaign(): CampaignRecord {
  const envelope = JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "campaigns", `${SOURCE}.json`), "utf8"),
  ) as { record: CampaignRecord };
  const record = structuredClone(envelope.record);
  const now = "2026-10-17T23:00:00.000Z";
  record.campaignId = CAMPAIGN_ID;
  record.campaignName = harborOakIdentityLock.businessName;
  delete record.routingHandoff;
  delete record.dispatchExecution;
  record.routeMapIntakeSubmittedAt = now;
  record.routeMapIntake = {
    submittedAt: now,
    answers: {
      "shared:businessName": harborOakIdentityLock.businessName,
      "social_and_promo_graphics:purpose": harborOakIdentityLock.campaign.offerName,
      "social_and_promo_graphics:facts":
        "HVAC tune-up and drain clear for homeowners who want plain, steady service.",
      "social_and_promo_graphics:prices": "$189 (was $249)",
      "social_and_promo_graphics:dates": "March 10 – April 15, 2026",
      "social_and_promo_graphics:cta": "Book online or call",
      "social_and_promo_graphics:phone": harborOakIdentityLock.campaign.phone,
      "social_and_promo_graphics:website": "harborandoak.example/book-tuneup",
      "social_and_promo_graphics:mustKeep": "Spring service you can trust",
      "social_and_promo_graphics:rights": "I have permission to use the materials I am supplying.",
    },
  };
  record.socialPromoRenderRelease = {
    releasedAt: now,
    authorizedBy: "owner",
    reason:
      "Tagia 2026-10-17: Machine runs both Social and Promo graphic factories for the Harbor and Oak quality gate. No new charge.",
  };
  if (record.approvedStudioPlan) {
    record.approvedStudioPlan = {
      ...record.approvedStudioPlan,
      selectedServiceIds: ["social_and_promo_graphics"],
    };
  }
  if (record.paymentTruth) {
    record.paymentTruth = {
      ...record.paymentTruth,
      status: "confirmed",
      checkoutSessionId: "local-harbor-oak-quality-gate-no-charge",
      paymentIntentId: null,
      stripeEventId: null,
      sandbox: true,
      expectedAmountCents: 15920,
      confirmedAmountCents: 15920,
      selectedServiceIds: ["social_and_promo_graphics"],
    };
  }
  record.paymentReceivedAt = now;
  if (record.postPayActivation) {
    record.postPayActivation = {
      ...record.postPayActivation,
      checkoutSessionId: "local-harbor-oak-quality-gate-no-charge",
      paymentIntentId: null,
      jobIds: [`${CAMPAIGN_ID}:social_and_promo_graphics`],
      intakeComplete: true,
    };
  }
  if (record.condensedOffer) {
    record.condensedOffer = {
      ...record.condensedOffer,
      customerName: "Harbor and Oak",
      company: harborOakIdentityLock.businessName,
      projectNeed: harborOakIdentityLock.campaign.offerName,
    };
  }
  return record;
}

describe("Harbor & Oak Social & Promo Machine production", () => {
  it(
    "runs both graphic factories from Machine and keeps certification labels off the customer files",
    async () => {
      const record = harborCampaign();
      const saved = await upsertCampaignRecord(record, "unclaimed-client:harbor-oak-quality-gate");
      await getOrGenerateTasks(CAMPAIGN_ID, saved.record);
      const materials = await getOrInitializeMaterials(CAMPAIGN_ID, saved.record);
      const logo = materials.items.find((item) => item.category === "logo-brand");
      if (!logo) throw new Error("Social package did not open a logo slot.");
      logo.reviewStatus = "approved_for_use";
      logo.url = LOGO;
      logo.relatedServiceIds = ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"];
      await writeMaterialsEnvelope({ ...materials, items: materials.items });

      const dispatched = await ensureDispatchExecution(saved.record);
      if (!dispatched.ok) {
        throw new Error(`${dispatched.error}: ${dispatched.message}`);
      }
      const parent = socialPromoParentProductionState(dispatched.campaign);
      const results = dispatched.dispatch.designRendererObserver?.results ?? [];
      const social = results.find((entry) => entry.skuId === "v2-rtu-social-posts");
      const graphics = results.find((entry) => entry.skuId === "v2-rtu-promotion-graphics");
      expect(social?.action).toBe("invoked");
      expect(graphics?.action).toBe("invoked");
      expect(social?.ok).toBe(true);
      expect(graphics?.ok).toBe(true);
      expect(parent.state).toBe("complete");

      const root = path.join(process.cwd(), "data", "campaign-design-artifacts", CAMPAIGN_ID);
      const html: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir, { withFileTypes: true })) {
          const abs = path.join(dir, name.name);
          if (name.isDirectory()) walk(abs);
          else if (name.name.endsWith(".html") || name.name.endsWith(".txt")) {
            html.push(readFileSync(abs, "utf8"));
          }
        }
      };
      walk(root);
      const joined = html.join("\n");
      expect(joined).not.toMatch(/CERTIFICATION FIXTURE|\(CERT\)|INTERNAL TEST/);
      expect(joined).toContain("$189");
      expect(joined).toContain("Harbor & Oak");

      const log = readProductionTeamLog(process.cwd(), CAMPAIGN_ID);
      expect(log.reports.some((report) => report.to === "DESIGN_PRODUCTION")).toBe(true);
      expect(log.reports.some((report) => report.from === "QUALITY_TEAM")).toBe(true);
      expect(dispatched.campaign.campaignStatus === "READY_FOR_REVIEW" || parent.state === "complete").toBe(
        true,
      );
    },
    240000,
  );
});
