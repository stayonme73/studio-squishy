/**
 * Shared adapter boundary — setup and update use the same platform adapters.
 * This package declares capability + planning only; no live platform calls.
 */

import { getPlatformCapability } from "./capability";
import type {
  PlatformCapabilityRecord,
  SocialPlatform,
  SocialProfileMode,
  SocialProfileMutation,
  SocialProfileSnapshot,
  SocialProfileWorkPacket,
} from "./types";

export type AdapterPlanResult = {
  platform: SocialPlatform;
  mode: SocialProfileMode;
  capability: PlatformCapabilityRecord;
  canExecuteOwnerIndependent: boolean;
  supportedMutations: SocialProfileMutation[];
  rejectedMutations: { field: string; reason: string }[];
  blocker: string | null;
};

export function planPlatformAdapter(
  packet: Pick<
    SocialProfileWorkPacket,
    "platform" | "mode" | "mutations" | "authorization"
  >,
): AdapterPlanResult {
  const capability = getPlatformCapability(packet.platform);
  const supportedMutations: SocialProfileMutation[] = [];
  const rejectedMutations: { field: string; reason: string }[] = [];

  for (const mutation of packet.mutations) {
    const fieldCap = capability.fields.find((f) => f.field === mutation.field);
    if (fieldCap?.writable === true) {
      supportedMutations.push(mutation);
    } else {
      rejectedMutations.push({
        field: mutation.field,
        reason: fieldCap?.note ?? "unsupported field",
      });
    }
  }

  let blocker: string | null = null;
  if (!capability.ownerIndependentMutation) {
    blocker = capability.verdict;
  } else if (!packet.authorization) {
    blocker = "INTEGRATION READY — ACCOUNT/AUTH BLOCKER";
  } else if (capability.verdict !== "PROVEN") {
    blocker = capability.verdict;
  }

  return {
    platform: packet.platform,
    mode: packet.mode,
    capability,
    canExecuteOwnerIndependent:
      capability.ownerIndependentMutation &&
      Boolean(packet.authorization) &&
      supportedMutations.length > 0 &&
      capability.verdict === "PROVEN",
    supportedMutations,
    rejectedMutations,
    blocker,
  };
}

/** Read-back model — compare selected fields when platform read is available. */
export function verifyReadback(input: {
  platform: SocialPlatform;
  expected: Partial<Record<string, string>>;
  actual: SocialProfileSnapshot;
}): {
  ok: boolean;
  mismatches: string[];
  unavailable: boolean;
} {
  if (input.actual.source === "unavailable") {
    return { ok: false, mismatches: [], unavailable: true };
  }
  const capability = getPlatformCapability(input.platform);
  const mismatches: string[] = [];
  for (const [field, expectedValue] of Object.entries(input.expected)) {
    const fieldCap = capability.fields.find((f) => f.field === field);
    if (fieldCap?.readable !== true) continue;
    const actualValue = input.actual.fields[field as keyof typeof input.actual.fields];
    if ((actualValue ?? "") !== expectedValue) {
      mismatches.push(`${field}: expected bound value, readback differed`);
    }
  }
  return { ok: mismatches.length === 0, mismatches, unavailable: false };
}

export function setupVsUpdateBoundary(mode: SocialProfileMode): {
  createsAccount: false;
  requiresExistingAccount: true;
  requiresBeforeSnapshot: boolean;
  note: string;
} {
  return {
    createsAccount: false,
    requiresExistingAccount: true,
    requiresBeforeSnapshot: mode === "update",
    note:
      mode === "setup"
        ? "Setup = complete supported profile fields on a customer-owned account after authorization — not account creation."
        : "Update = before snapshot → exact approved mutations → read-back — never unrelated settings.",
  };
}
