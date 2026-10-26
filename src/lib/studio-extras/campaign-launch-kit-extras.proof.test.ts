/**
 * Produce the two Campaign Launch Kit extras on Harbor & Oak only.
 * Runs only when STUDIO_CAMPAIGN_LAUNCH_KIT_FINISH=1.
 * Stops before the estimated model spend reaches $2.
 * Does not replace the seven released files.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { CampaignMaterialItem } from "@/lib/materials/types";
import { readMaterialsEnvelope, writeMaterialsEnvelope } from "@/lib/materials/store";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { initialStudioExtrasTruth, approveAndDeliverReadyStudioExtras } from "@/lib/studio-extras/machine";
import { runStudioExtrasProduction } from "@/lib/studio-extras/production";
import { loadStudioLocalEnv } from "@/lib/studio-production-team-workforce/anthropic-runtime";
import {
  collectProviderCost,
  summarizeProviderCost,
} from "@/lib/studio-project-alpha/cost-telemetry";

const ROOT = process.cwd();
const CAMPAIGN_ID = "harbor-oak-campaign-launch-kit";
const BUDGET_USD = 2;
const ALREADY_SPENT = 0.031377;
const RELEASED = [
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-2/Promotional-Flyer.png",
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-2/Promotional-Flyer.pdf",
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-1/Promotional-Email.txt",
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-1/Text-Campaign.txt",
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-1/Campaign-Graphic-Square.png",
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-1/Campaign-Graphic-Portrait.png",
  "data/file-room-objects/clients/unclaimed-client-harbor-oak-campaign-launch-kit/campaigns/harbor-oak-campaign-launch-kit/jobs/harbor-oak-campaign-launch-kit-campaign_launch_kit/review_proof/Version-1/Usage-Guide.txt",
];

function sha(rel: string): string {
  return createHash("sha256").update(readFileSync(path.join(ROOT, rel))).digest("hex");
}

function tree(): Map<string, string> {
  const root = path.join(ROOT, "data", "campaign-design-artifacts", CAMPAIGN_ID);
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else out.set(path.relative(root, child).replaceAll("\\", "/"), sha(path.relative(ROOT, child)));
    }
  };
  walk(root);
  return out;
}

function item(id: string, text: string, kind: CampaignMaterialItem["contentKind"]): CampaignMaterialItem {
  return {
    id,
    category: kind === "url" ? "url-link" : kind === "file-metadata" ? "logo-brand" : kind === "confirmation" ? "factual-confirmation" : "factual-confirmation",
    requirementLevel: "required",
    reviewStatus: "approved_for_use",
    contentKind: kind,
    label: id,
    reason: "Harbor & Oak kit extra input",
    relatedServiceIds: ["studio-extra:review_request_kit", "studio-extra:menu_price_list"] as never,
    text: kind === "text" ? text : undefined,
    url: kind === "url" || kind === "file-metadata" ? text : undefined,
    fileName: kind === "file-metadata" ? path.basename(text) : undefined,
    confirmedAt: kind === "confirmation" ? "2026-10-21T04:45:00.000Z" : undefined,
    uploadStatus: kind === "file-metadata" ? "stored" : "none",
    storageRef: null,
  };
}

describe.skipIf(process.env.STUDIO_CAMPAIGN_LAUNCH_KIT_FINISH !== "1")(
  "Campaign Launch Kit extras",
  () => {
    it(
      "produces Review Request Kit and Menu / Price List beside the released files",
      async () => {
        loadStudioLocalEnv(ROOT);
        const beforeReleased = Object.fromEntries(RELEASED.map((rel) => [rel, sha(rel)]));
        const beforeTree = tree();
        const envelope = await readCampaignEnvelope(CAMPAIGN_ID);
        if (!envelope) throw new Error("Kit campaign is missing.");
        if (envelope.clientUserId !== "local-harbor-oak-kit-disposable") {
          throw new Error("Kit campaign owner changed. Extras were not started.");
        }
        const at = new Date().toISOString();
        const truth = initialStudioExtrasTruth(
          "campaign_launch_kit",
          ["review_request_kit", "menu_price_list"],
          at,
        );
        const added = [
          item("studio-extra-contact", "(804) 555-0142", "text"),
          item(
            "studio-extra-logo",
            "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/materials/harbor-oak-anchor-oak-oval-v1.svg",
            "file-metadata",
          ),
          item("studio-extra-review-link", "https://harborandoak.example/review", "url"),
          item("studio-extra-text-consent", "yes", "confirmation"),
          item("studio-extra-menu-kind", "price list", "text"),
          item(
            "studio-extra-menu-items",
            "Services | Spring Tune-Up + Drain Clear | HVAC tune-up and drain clear for homeowners who want plain, steady service. | $189",
            "text",
          ),
          item("studio-extra-menu-notes", "March 10 – April 15, 2026. Prices supplied by the customer.", "text"),
        ];
        const materials = await readMaterialsEnvelope(CAMPAIGN_ID);
        const items = [...(materials?.items ?? []).filter((entry) => !entry.id.startsWith("studio-extra-")), ...added];
        if (materials) await writeMaterialsEnvelope({ ...materials, items });

        const spentBefore = ALREADY_SPENT;
        if (spentBefore >= BUDGET_USD) throw new Error("Budget already spent.");
        const { result, ledger } = await collectProviderCost(() =>
          runStudioExtrasProduction({
            repoRoot: ROOT,
            campaign: { ...envelope.record, studioExtras: truth },
            materials: items,
          }),
        );
        const summary = summarizeProviderCost(ledger);
        const spent = spentBefore + summary.totalCostUsd;
        let delivered = result.truth;
        if (delivered && spent < BUDGET_USD) {
          delivered = approveAndDeliverReadyStudioExtras(delivered, new Date().toISOString()).truth;
        }
        if (delivered) {
          await upsertCampaignRecord(
            { ...envelope.record, studioExtras: delivered },
            envelope.clientUserId,
          );
        }

        const afterTree = tree();
        const changedReleased = [...beforeTree.keys()].filter((rel) => afterTree.get(rel) !== beforeTree.get(rel));
        const unexpected = [...afterTree.keys()].filter(
          (rel) => !beforeTree.has(rel) && !rel.toLowerCase().includes("studio-extra"),
        );
        const afterReleased = Object.fromEntries(RELEASED.map((rel) => [rel, sha(rel)]));
        const evidence = {
          at: new Date().toISOString(),
          ratesVerifiedAgainstLiveBilling: false,
          priorVoiceAndCheckoutUsd: spentBefore,
          extrasUsd: summary.totalCostUsd,
          totalUsd: spent,
          callsMissingRate: summary.callsMissingRate,
          byModel: summary.byModel,
          records: delivered?.records.map((record) => ({
            id: record.id,
            state: record.state,
            units: record.units.map((unit) => ({
              unitId: unit.unitId,
              quality: unit.quality.outcome,
              summary: unit.quality.summary ?? null,
              artifacts: unit.artifacts.map((artifact) => artifact.path),
            })),
          })) ?? [],
          releasedFilesUnchanged: JSON.stringify(beforeReleased) === JSON.stringify(afterReleased),
          existingArtifactBytesUnchanged: changedReleased.length === 0,
          unexpectedNewFiles: unexpected,
        };
        const out = path.join(ROOT, "data", "campaign-launch-kit-finish", "extras.json");
        mkdirSync(path.dirname(out), { recursive: true });
        writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`);
        expect(evidence.releasedFilesUnchanged).toBe(true);
        expect(evidence.existingArtifactBytesUnchanged).toBe(true);
        expect(unexpected).toEqual([]);
        expect(spent).toBeLessThan(BUDGET_USD);
        expect(summary.callsMissingRate).toBe(0);
      },
      15 * 60 * 1000,
    );
  },
);
