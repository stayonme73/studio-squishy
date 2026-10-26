import type { CampaignRecord } from "@/config/studio-board";
import { studioProductionTeamWorkforceV1 } from "@/config/studio-production-team-workforce-v1";
import { readProjectIntakeAnswer } from "@/lib/project-intake-plan";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";

import { attemptKindFromLoopOrigin } from "./accounting";
import { assignmentForSku, printFileRequired } from "./roster";
import { appendProductionPacket } from "./bus";
import type { ProductionTeamJobPacket } from "./types";

function intakeFactsForSku(
  campaign: CampaignRecord,
  skuId: string,
): Record<string, string> {
  const answers = campaign.routeMapIntake?.answers ?? {};
  const facts: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (!key.startsWith(`${skuId}:`)) continue;
    if (typeof value === "string" && value.trim()) {
      facts[key.slice(skuId.length + 1)] = value;
    }
  }
  if (!facts.businessName) {
    const name = readProjectIntakeAnswer(answers, "businessName", skuId);
    if (name) facts.businessName = name;
  }
  if (!facts.businessName && campaign.campaignName) {
    facts.businessName = campaign.campaignName;
  }
  return facts;
}

export function buildProductionJobPacket(input: {
  campaign: CampaignRecord;
  record: JobDispatchRecord;
  attemptKind?: ProductionTeamJobPacket["attemptKind"];
}): ProductionTeamJobPacket | null {
  const assignment = assignmentForSku(input.record.skuId);
  if (!assignment.capability) return null;
  const facts = intakeFactsForSku(input.campaign, input.record.skuId);
  const supporting = printFileRequired(input.record.skuId)
    ? assignment.supportingCapabilities
    : assignment.supportingCapabilities.filter((id) => id !== "PRINT_FILE_PRODUCTION");
  const origin = input.campaign.internalProductionLoop?.origin;
  return {
    packageId: studioProductionTeamWorkforceV1.packageId,
    packetId: `pt:${input.record.dispatchId}`,
    campaignId: input.campaign.campaignId,
    jobId: input.record.jobId,
    dispatchId: input.record.dispatchId,
    skuId: input.record.skuId,
    capability: assignment.capability,
    supportingCapabilities: supporting,
    attemptKind:
      input.attemptKind ??
      attemptKindFromLoopOrigin(origin) ??
      "internal_retry",
    intakeFacts: facts,
    brandRecordAvailable: Boolean(
      facts.businessName || facts.brandColors || facts.logo,
    ),
    authorizedMaterialIds: [],
    requestedFormat:
      facts.format ||
      facts.intendedUse ||
      facts.outputFormat ||
      null,
    intendedUse: facts.intendedUse || facts.use || facts.format || null,
    customerInstructions:
      facts.mustInclude ||
      facts.campaignGoal ||
      facts.videoPurpose ||
      facts.onScreenText ||
      null,
    priorWorkVersionId: null,
    currentWorkVersionId: null,
    createdAt: new Date().toISOString(),
  };
}

export function assignProductionTeamJobs(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  records: readonly JobDispatchRecord[];
}): readonly ProductionTeamJobPacket[] {
  const packets: ProductionTeamJobPacket[] = [];
  for (const record of input.records) {
    if (!record.executionIdentityReady) continue;
    const packet = buildProductionJobPacket({
      campaign: input.campaign,
      record,
    });
    if (!packet) continue;
    appendProductionPacket(input.repoRoot, packet);
    packets.push(packet);
  }
  return packets;
}
