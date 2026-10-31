import { readFile } from "node:fs/promises";
import path from "node:path";

import type { CampaignRecord } from "@/config/studio-board";
import { studioExtraDefinitions, type StudioExtraId } from "@/config/studio-extras-v1";

import { STUDIO_EXTRA_INPUT_SPECS } from "./inputs";
import { studioExtraCustomerStatus } from "./machine";
import type { StudioExtraArtifact, StudioExtraRecord, StudioExtraState, StudioExtrasCourtesy } from "./types";

export type StudioExtraFileView = {
  label: string;
  mimeType: string;
  /** Inline proof (Review) or attachment download (Final Delivery). */
  href: string;
  /** Plain-text artifacts are shown as text so the customer can read the copy. */
  text: string | null;
};

export type StudioExtraCustomerView = {
  id: StudioExtraId;
  name: string;
  state: StudioExtraState;
  statusLine: string;
  includes: readonly string[];
  waitingOn: readonly { label: string; prompt: string }[];
  files: readonly StudioExtraFileView[];
  canApprove: boolean;
  canRequestChange: boolean;
  lastChangeRequest: string | null;
};

export type StudioExtrasCustomerView = {
  extras: readonly StudioExtraCustomerView[];
  /** Present only when an Extra could not be completed. Never shown as a benefit. */
  courtesy: { percent: number; amountLabel: string; message: string } | null;
};

const REVIEWABLE: readonly StudioExtraState[] = ["ready_for_review", "approved", "delivered"];
const TEXT_LIMIT_BYTES = 20_000;

/**
 * Only artifacts the Machine recorded on this Extra, inside this campaign's
 * artifact folder, are ever served. The reused production lines write to
 * their own subfolders, so the boundary is the campaign folder.
 */
export function studioExtraArtifactAllowed(
  campaignId: string,
  artifact: Pick<StudioExtraArtifact, "path">,
): boolean {
  const normalized = path.normalize(artifact.path);
  const root = path.join("data", "campaign-design-artifacts", campaignId) + path.sep;
  return normalized.startsWith(root) && !normalized.split(path.sep).includes("..");
}

/**
 * Absolute path for an allowed Extra artifact. Uses fixed `data/campaign-design-artifacts`
 * segments only (no `path.join(cwd, dynamicRel)`) so Next/Vercel NFT does not trace the repo root.
 */
export function studioExtraArtifactAbsolutePath(
  repoRoot: string,
  campaignId: string,
  artifact: Pick<StudioExtraArtifact, "path">,
): string | null {
  if (!studioExtraArtifactAllowed(campaignId, artifact)) return null;
  const rel = artifact.path.replace(/\\/g, "/").replace(/^\/+/, "");
  const prefix = `data/campaign-design-artifacts/${campaignId}/`;
  if (!rel.startsWith(prefix)) return null;
  const suffixParts = rel.slice(prefix.length).split("/").filter(Boolean);
  if (suffixParts.some((part) => part === ".." || part === ".")) return null;
  return path.join(repoRoot, "data", "campaign-design-artifacts", campaignId, ...suffixParts);
}

export function studioExtraFileHref(
  campaignId: string,
  extraId: string,
  unitId: string,
  index: number,
  purpose: "proof" | "download",
): string {
  return `/api/campaigns/${encodeURIComponent(campaignId)}/studio-extras/files/${extraId}/${encodeURIComponent(unitId)}/${index}?purpose=${purpose}`;
}

async function readSmallText(
  repoRoot: string,
  campaignId: string,
  artifact: StudioExtraArtifact,
): Promise<string | null> {
  if (!artifact.mimeType.startsWith("text/plain")) return null;
  try {
    const abs = studioExtraArtifactAbsolutePath(repoRoot, campaignId, artifact);
    if (!abs) return null;
    const buffer = await readFile(abs);
    if (buffer.byteLength > TEXT_LIMIT_BYTES) return null;
    return buffer.toString("utf8");
  } catch {
    return null;
  }
}

async function filesFor(
  repoRoot: string,
  campaignId: string,
  record: StudioExtraRecord,
): Promise<StudioExtraFileView[]> {
  if (!REVIEWABLE.includes(record.state)) return [];
  const purpose = record.state === "delivered" ? "download" : "proof";
  const files: StudioExtraFileView[] = [];
  for (const unit of record.units) {
    for (const [index, artifact] of unit.artifacts.entries()) {
      if (!studioExtraArtifactAllowed(campaignId, artifact)) continue;
      // Machine-readable sidecars stay internal.
      if (artifact.mimeType === "application/json") continue;
      files.push({
        label: artifact.label,
        mimeType: artifact.mimeType,
        href: studioExtraFileHref(campaignId, record.id, unit.unitId, index, purpose),
        text: await readSmallText(repoRoot, campaignId, artifact),
      });
    }
  }
  return files;
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function courtesyCustomerMessage(courtesy: StudioExtrasCourtesy): string {
  const amount = dollars(courtesy.refundAmountCents ?? courtesy.totalAdjustmentCents);
  const lead = `A ${courtesy.percent}% Courtesy Adjustment of ${amount}`;
  switch (courtesy.paymentExecution) {
    case "completed":
      return `${lead} was returned to your original card.`;
    case "accepted":
      return `${lead} was accepted by the payment processor. It has not completed, so it is not back on your card yet.`;
    case "failed":
      return `${lead} could not be returned to your card. The Studio is reviewing it.`;
    case "uncertain":
      return `${lead} could not be confirmed with the payment processor. The Studio is reviewing it.`;
    default:
      return `${lead} applies to the amount you paid. It has not been returned to your card.`;
  }
}

export async function resolveStudioExtrasCustomerView(
  campaign: Pick<CampaignRecord, "campaignId" | "studioExtras">,
  repoRoot = process.cwd(),
): Promise<StudioExtrasCustomerView | null> {
  const truth = campaign.studioExtras;
  if (!truth || truth.records.length === 0) return null;
  const extras: StudioExtraCustomerView[] = [];
  for (const record of truth.records) {
    extras.push({
      id: record.id,
      name: record.name,
      state: record.state,
      statusLine: studioExtraCustomerStatus(record),
      includes: studioExtraDefinitions[record.id].includes,
      waitingOn:
        record.state === "waiting_on_client"
          ? record.missingInputs.map((key) => ({
              label: STUDIO_EXTRA_INPUT_SPECS[key].label,
              prompt: STUDIO_EXTRA_INPUT_SPECS[key].prompt,
            }))
          : [],
      files: await filesFor(repoRoot, campaign.campaignId, record),
      canApprove: record.state === "ready_for_review",
      canRequestChange: record.state === "ready_for_review",
      lastChangeRequest: record.revisionNote,
    });
  }
  const courtesy = truth.courtesy;
  const showCourtesy =
    courtesy && (courtesy.status === "COURTESY_ADJUSTMENT_REQUIRED" || courtesy.status === "issued");
  return {
    extras,
    courtesy: showCourtesy
      ? {
          percent: courtesy.percent,
          amountLabel: dollars(courtesy.totalAdjustmentCents),
          message: courtesyCustomerMessage(courtesy),
        }
      : null,
  };
}
