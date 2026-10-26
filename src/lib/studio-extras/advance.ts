import type Stripe from "stripe";

import type { CampaignRecord } from "@/config/studio-board";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { getOrInitializeMaterials } from "@/lib/materials/store";

import { issueStudioExtrasCourtesyRefund } from "./courtesy-refund";
import { settleStudioExtrasRevisionRounds, withStudioExtrasCourtesy } from "./machine";
import { runStudioExtrasProduction, type UnitAdapter } from "./production";
import type { CampaignStudioExtras } from "./types";

const inFlight = new Map<string, Promise<CampaignRecord>>();

/**
 * Production ran from `started`. Any record the customer changed meanwhile
 * (approve, change request) keeps the stored version; production results only
 * land on records nobody else touched.
 */
export function mergeStudioExtrasAfterProduction(
  started: CampaignStudioExtras,
  produced: CampaignStudioExtras,
  stored: CampaignStudioExtras | undefined,
  campaign: Pick<CampaignRecord, "paymentTruth">,
  at: string,
): CampaignStudioExtras {
  if (!stored || stored.updatedAt === started.updatedAt) return produced;
  const records = produced.records.map((record) => {
    const before = started.records.find((r) => r.id === record.id);
    const now = stored.records.find((r) => r.id === record.id);
    if (!before || !now) return record;
    return now.history.length !== before.history.length ? now : record;
  });
  const merged: CampaignStudioExtras = {
    ...produced,
    records,
    revisionRounds: stored.revisionRounds ?? produced.revisionRounds,
    updatedAt: at,
  };
  return withStudioExtrasCourtesy(settleStudioExtrasRevisionRounds(merged, at), campaign, at);
}

/**
 * Advance Studio Extras for a paid campaign and persist the shared truth.
 * One run per campaign at a time; a concurrent caller shares the same run.
 */
export async function advanceStudioExtras(
  campaign: CampaignRecord,
  options?: {
    repoRoot?: string;
    adapters?: Partial<Record<string, UnitAdapter>>;
    stripe?: Pick<Stripe, "refunds">;
    env?: NodeJS.ProcessEnv;
  },
): Promise<CampaignRecord> {
  if (!campaign.studioExtras || campaign.studioExtras.records.length === 0) return campaign;
  if (campaign.paymentTruth?.status !== "confirmed") return campaign;
  const running = inFlight.get(campaign.campaignId);
  if (running) return running;
  const run = (async () => {
    const startEnvelope = await readCampaignEnvelope(campaign.campaignId);
    const start = startEnvelope?.record.studioExtras ? startEnvelope.record : campaign;
    const materials = await getOrInitializeMaterials(start.campaignId, start);
    const produced = await runStudioExtrasProduction({
      repoRoot: options?.repoRoot ?? process.cwd(),
      campaign: start,
      materials: materials.items,
      adapters: options?.adapters,
    });
    if (!produced.changed || !produced.truth) return start;
    const envelope = await readCampaignEnvelope(campaign.campaignId);
    const latest = envelope?.record ?? start;
    const at = new Date().toISOString();
    const truth = mergeStudioExtrasAfterProduction(
      start.studioExtras!,
      produced.truth,
      latest.studioExtras,
      latest,
      at,
    );
    const saved = await upsertCampaignRecord(
      { ...latest, studioExtras: truth, updatedAt: at },
      envelope?.clientUserId,
    );
    return issueStudioExtrasCourtesyRefund(saved.record, {
      stripe: options?.stripe,
      env: options?.env,
    });
  })();
  inFlight.set(campaign.campaignId, run);
  try {
    return await run;
  } finally {
    inFlight.delete(campaign.campaignId);
  }
}
