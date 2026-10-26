/**
 * Connects Owner-desk routes to the existing attention signal shape.
 * Does not write the live attention file and does not play the audible alert.
 */
import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import type { OwnerDeskReason } from "@/lib/job-control/types";

import {
  QUALITY_OWNER_ATTENTION_LABELS,
  type QualityOwnerAttentionReason,
} from "./quality-owner-attention";
import type { CoordinationAttention, CoordinationRoute } from "./route-attention";

export type OwnerAttentionReason = OwnerDeskReason | QualityOwnerAttentionReason;

export const OWNER_ATTENTION_DELIVERY_PREREQUISITE =
  "Playing the alert requires the existing work-heartbeat pulse with --waiting-owner, which writes the live attention file and runs scripts/owner-attention-alert.mjs. This package does not call that." as const;

export type OwnerAttentionLedgerRow = {
  alertId: string;
  fingerprint: string;
  source: string;
  reason: OwnerAttentionReason;
  pending: boolean;
  createdAt: string;
  resolvedAt: string | null;
};

export type OwnerAttentionLedger = {
  alerts: OwnerAttentionLedgerRow[];
};

export type OwnerAttentionSignal = {
  state: "RED" | "GREEN";
  kind: "OWNER_ACTION_REQUIRED_NOW" | "CONTINUE";
  notifyKind: "owner_red_audible" | "none";
  alertId: string | null;
  reason: OwnerAttentionReason | null;
  reasonLabel: string | null;
  exactOwnerAction: string;
  sources: string[];
  pending: boolean;
  pendingCount: number;
  duplicate: boolean;
  delivered: false;
  tagiaMustInterveneNow: boolean;
  customerImpact: "No customer message sent. No job change.";
};

const ATTENTION_LABELS: Record<OwnerAttentionReason, string> = {
  ...OWNER_CONTROL_ROOM_SECTION.ownerDeskReasonLabels,
  ...QUALITY_OWNER_ATTENTION_LABELS,
};

function isAttentionReason(value: string | null): value is OwnerAttentionReason {
  return value != null && value in ATTENTION_LABELS;
}

function fingerprint(route: CoordinationRoute): string | null {
  if (route.proposedDestination !== "owner_desk" || !isAttentionReason(route.ownerDeskReason)) return null;
  return route.attentionKey ?? `${route.source}|${route.ownerDeskReason}`;
}

function label(reason: OwnerAttentionReason): string {
  return ATTENTION_LABELS[reason];
}

function ownerAction(source: string, reason: OwnerAttentionReason): string {
  const decision = `Decide ${label(reason)} for ${source}.`;
  if (reason === "compliance_hold") {
    return `${decision} The compliance hold remains until you resolve it. This signal is not approval to resume blocked work.`;
  }
  if (reason === "direction_disagreement") {
    return `${decision} This signal is not approval to resume blocked work.`;
  }
  return decision;
}

export function applyOwnerAttentionSignal(input: {
  attention: CoordinationAttention;
  ledger?: OwnerAttentionLedger;
  now?: string;
}): { signal: OwnerAttentionSignal; ledger: OwnerAttentionLedger } {
  const now = input.now ?? new Date().toISOString();
  const ledger: OwnerAttentionLedger = {
    alerts: (input.ledger?.alerts ?? []).map((row) => ({ ...row })),
  };
  const qualifying = input.attention.ownerAlerts.filter((route) => fingerprint(route));
  const current = new Set(qualifying.map((route) => fingerprint(route)));

  for (const row of ledger.alerts) {
    if (row.pending && !current.has(row.fingerprint)) {
      row.pending = false;
      row.resolvedAt = now;
    }
  }

  let created = 0;
  for (const route of qualifying) {
    const key = fingerprint(route);
    if (!key || !isAttentionReason(route.ownerDeskReason)) continue;
    const existing = ledger.alerts.find((row) => row.fingerprint === key && row.pending);
    if (existing) continue;
    ledger.alerts.push({
      alertId: `owner-desk:${key}`,
      fingerprint: key,
      source: route.source,
      reason: route.ownerDeskReason,
      pending: true,
      createdAt: now,
      resolvedAt: null,
    });
    created += 1;
  }

  const pending = ledger.alerts.filter((row) => row.pending);
  if (pending.length === 0) {
    return {
      signal: {
        state: "GREEN",
        kind: "CONTINUE",
        notifyKind: "none",
        alertId: null,
        reason: null,
        reasonLabel: null,
        exactOwnerAction: "No Owner decision is pending.",
        sources: [],
        pending: false,
        pendingCount: 0,
        duplicate: false,
        delivered: false,
        tagiaMustInterveneNow: false,
        customerImpact: "No customer message sent. No job change.",
      },
      ledger,
    };
  }

  const primary = pending[0];
  return {
    signal: {
      state: "RED",
      kind: "OWNER_ACTION_REQUIRED_NOW",
      notifyKind: created > 0 ? "owner_red_audible" : "none",
      alertId: primary.alertId,
      reason: primary.reason,
      reasonLabel: label(primary.reason),
      exactOwnerAction: pending.map((row) => ownerAction(row.source, row.reason)).join(" "),
      sources: pending.map((row) => row.source),
      pending: true,
      pendingCount: pending.length,
      duplicate: created === 0,
      delivered: false,
      tagiaMustInterveneNow: true,
      customerImpact: "No customer message sent. No job change.",
    },
    ledger,
  };
}
