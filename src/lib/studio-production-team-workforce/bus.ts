import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { studioProductionTeamWorkforceV1 } from "@/config/studio-production-team-workforce-v1";

import type { ProductionTeamJobPacket, ProductionTeamLog, ProductionTeamReport } from "./types";

export function productionTeamLogRel(campaignId: string): string {
  return `data/campaign-design-artifacts/${campaignId}/production-team/log.json`;
}

function emptyLog(campaignId: string): ProductionTeamLog {
  return {
    packageId: studioProductionTeamWorkforceV1.packageId,
    campaignId,
    packets: [],
    reports: [],
    updatedAt: new Date().toISOString(),
  };
}

export function readProductionTeamLog(
  repoRoot: string,
  campaignId: string,
): ProductionTeamLog {
  const abs = path.join(repoRoot, productionTeamLogRel(campaignId));
  if (!existsSync(abs)) return emptyLog(campaignId);
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as ProductionTeamLog;
  } catch {
    return emptyLog(campaignId);
  }
}

export function writeProductionTeamLog(
  repoRoot: string,
  log: ProductionTeamLog,
): ProductionTeamLog {
  const rel = productionTeamLogRel(log.campaignId);
  const abs = path.join(repoRoot, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  const next: ProductionTeamLog = {
    ...log,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(abs, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function appendProductionPacket(
  repoRoot: string,
  packet: ProductionTeamJobPacket,
): ProductionTeamLog {
  const log = readProductionTeamLog(repoRoot, packet.campaignId);
  const packets = log.packets.filter((row) => row.packetId !== packet.packetId);
  return writeProductionTeamLog(repoRoot, {
    ...log,
    packets: [...packets, packet],
  });
}

export function appendProductionReport(
  repoRoot: string,
  report: ProductionTeamReport,
): ProductionTeamLog {
  const log = readProductionTeamLog(repoRoot, report.campaignId);
  return writeProductionTeamLog(repoRoot, {
    ...log,
    reports: [...log.reports, report],
  });
}

export function machineBrokerReport(input: {
  packet: ProductionTeamJobPacket;
  from: ProductionTeamReport["from"];
  to: ProductionTeamReport["to"];
  kind: ProductionTeamReport["kind"];
  status: string;
  message: string;
  artifactRelativePath?: string;
  qaPassed?: boolean;
}): ProductionTeamReport {
  return {
    packageId: studioProductionTeamWorkforceV1.packageId,
    reportId: `ptr:${input.packet.packetId}:${input.kind}:${Date.now()}`,
    packetId: input.packet.packetId,
    campaignId: input.packet.campaignId,
    jobId: input.packet.jobId,
    skuId: input.packet.skuId,
    from: input.from,
    to: input.to,
    kind: input.kind,
    status: input.status,
    artifactRelativePath: input.artifactRelativePath,
    qaPassed: input.qaPassed,
    message: input.message,
    attemptKind: input.packet.attemptKind,
    createdAt: new Date().toISOString(),
  };
}
