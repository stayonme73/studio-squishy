import type { CampaignRecord } from "@/config/studio-board";

import {
  readOfficialFieldValue,
  writeOfficialFieldValue,
  type DirectApplyTargetKey,
} from "./allowlist";
import { valueFingerprint } from "./normalize";
import type { CustomerFieldTokenMap, FieldChangeToken } from "./types";

let authorizedCustomerFieldWrite = false;

/** Gate server writes that mutate direct-apply fields outside the centralized helper. */
export async function withAuthorizedCustomerFieldWrite<T>(fn: () => Promise<T>): Promise<T> {
  authorizedCustomerFieldWrite = true;
  try {
    return await fn();
  } finally {
    authorizedCustomerFieldWrite = false;
  }
}

export function isAuthorizedCustomerFieldWrite(): boolean {
  return authorizedCustomerFieldWrite;
}

export function readFieldToken(
  record: CampaignRecord,
  key: DirectApplyTargetKey,
): FieldChangeToken | null {
  return record.customerFieldTokens?.[key] ?? null;
}

function nextRevision(current: FieldChangeToken | null | undefined): number {
  return (current?.revision ?? 0) + 1;
}

function buildToken(value: string, previous: FieldChangeToken | null | undefined): FieldChangeToken {
  return {
    revision: nextRevision(previous),
    valueFingerprint: valueFingerprint(value),
  };
}

/**
 * Initialize tokens on first Project Details submit — revision 1 per populated field.
 * Initialization only; blocked after projectDetailsSubmittedAt is set.
 */
export function seedCustomerFieldTokensFromProjectDetails(record: CampaignRecord): CampaignRecord {
  const keys: DirectApplyTargetKey[] = [
    "primary_approver_name",
    "primary_approver_email",
    "secondary_approver_name",
    "secondary_approver_email",
    "destination_url",
    "social_account_links",
    "email_sender_name",
    "email_platform",
  ];

  const tokens: CustomerFieldTokenMap = { ...(record.customerFieldTokens ?? {}) };
  for (const key of keys) {
    const value = readOfficialFieldValue(record, key);
    const fp = valueFingerprint(value);
    if (!fp) continue;
    tokens[key] = { revision: 1, valueFingerprint: fp };
  }

  return { ...record, customerFieldTokens: tokens };
}

/**
 * Centralized official write — updates field value, increments revision, updates campaign timestamp.
 */
export function updateCustomerField(
  record: CampaignRecord,
  key: DirectApplyTargetKey,
  newValue: string,
): CampaignRecord {
  const now = new Date().toISOString();
  const previousToken = readFieldToken(record, key);
  const updated = writeOfficialFieldValue(record, key, newValue);
  const token = buildToken(newValue, previousToken);

  return {
    ...updated,
    customerFieldTokens: {
      ...(updated.customerFieldTokens ?? {}),
      [key]: token,
    },
    updatedAt: now,
  };
}

/** Preserve direct-apply fields when unauthorized upsert attempts to change them. */
export function preserveDirectApplyFieldsOnUpsert(
  existing: CampaignRecord,
  incoming: CampaignRecord,
): CampaignRecord {
  if (authorizedCustomerFieldWrite) return incoming;

  let merged = { ...incoming };
  const keys: DirectApplyTargetKey[] = [
    "primary_approver_name",
    "primary_approver_email",
    "secondary_approver_name",
    "secondary_approver_email",
    "destination_url",
    "social_account_links",
    "email_sender_name",
    "email_platform",
  ];

  for (const key of keys) {
    const existingValue = readOfficialFieldValue(existing, key);
    const incomingValue = readOfficialFieldValue(merged, key);
    if (valueFingerprint(existingValue) !== valueFingerprint(incomingValue)) {
      merged = writeOfficialFieldValue(merged, key, existingValue ?? "");
    }
  }

  return {
    ...merged,
    customerFieldTokens: existing.customerFieldTokens ?? merged.customerFieldTokens,
  };
}

export function ensureCustomerFieldTokensBackfill(record: CampaignRecord): CampaignRecord {
  if (record.customerFieldTokens && Object.keys(record.customerFieldTokens).length > 0) {
    return record;
  }
  if (!record.projectDetailsSubmittedAt) return record;
  return seedCustomerFieldTokensFromProjectDetails(record);
}

export function fieldTokensMatch(
  captured: FieldChangeToken | null | undefined,
  current: FieldChangeToken | null | undefined,
): boolean {
  if (!captured || !current) return false;
  return captured.revision === current.revision && captured.valueFingerprint === current.valueFingerprint;
}
