/**
 * Machine → Scout engineering recovery.
 * Routine system defects are not Owner tickets.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";

export type EngineeringDefectKind =
  | "dead_control"
  | "campaign_customer_mismatch"
  | "api_provider_outage"
  | "renderer_failure"
  | "broken_export"
  | "corrupt_file"
  | "dispatch_failure"
  | "data_state_bug";

export type EngineeringRecoveryTicket = {
  ticketId: string;
  kind: EngineeringDefectKind;
  campaignId: string;
  skuId: string;
  message: string;
  blockUnsafeProduction: true;
  ownerInvolved: false;
  createdAt: string;
};

const ENGINEERING_KINDS: Record<string, EngineeringDefectKind> = {
  RENDER_FAILURE: "renderer_failure",
  EXPORT_FAILURE: "broken_export",
  BROKEN_ASSET_REFERENCE: "broken_export",
  PARTIAL_RENDER_STATE: "corrupt_file",
  SKU_NOT_SUPPORTED: "dispatch_failure",
};

export function isEngineeringDefect(failureCode: string | undefined): boolean {
  if (!failureCode) return false;
  return Boolean(ENGINEERING_KINDS[failureCode]);
}

export function createEngineeringRecoveryTicket(input: {
  repoRoot: string;
  campaignId: string;
  skuId: string;
  failureCode: string;
  message: string;
}): EngineeringRecoveryTicket {
  const kind = ENGINEERING_KINDS[input.failureCode] ?? "data_state_bug";
  const ticket: EngineeringRecoveryTicket = {
    ticketId: `eng:${input.campaignId}:${Date.now().toString(36)}`,
    kind,
    campaignId: input.campaignId,
    skuId: input.skuId,
    message: input.message,
    blockUnsafeProduction: true,
    ownerInvolved: false,
    createdAt: new Date().toISOString(),
  };
  const dir = path.join(input.repoRoot, "data", "studio-engineering-tickets");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    // ':' is legal in a ticket id but illegal in a Windows filename.
    path.join(dir, `${ticket.ticketId.replace(/[^\w-]/g, "_")}.json`),
    `${JSON.stringify(ticket, null, 2)}\n`,
    "utf8",
  );
  return ticket;
}
