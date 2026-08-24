export const SUPERVISION_WAKE_IDEMPOTENCY_TABLE =
  "supervision_wake_idempotency" as const;
export const SUPERVISION_CLAIM_WAKE_IDEMPOTENCY_RPC =
  "supervision_claim_wake_idempotency" as const;
export const SUPERVISION_COMPLETE_WAKE_IDEMPOTENCY_RPC =
  "supervision_complete_wake_idempotency" as const;

export const SUPERVISION_WAKE_UNIQUE_SUCCESS_PER_HOUR = 18 as const;
export const SUPERVISION_WAKE_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
export const SUPERVISION_WAKE_HOUR_MS = 60 * 60 * 1000;

export const SUPERVISION_WAKE_PROVIDER_RATE_LIMIT = {
  windowLimit: 60,
  windowSize: 60,
  aggregateBy: ["ip", "domain"] as const,
};

export type WakeIdempotencyClaim =
  | { kind: "replay"; status: number; body: unknown }
  | { kind: "in_progress" }
  | { kind: "fresh" }
  | { kind: "hour_cap" };

type WakeRow = {
  idempotencyKey: string;
  createdAt: number;
  expiresAt: number;
  status: "in_progress" | "completed";
  firstCompletedAt: number | null;
  responseStatus: number | null;
  responseBody: unknown;
};

export function createWakeIdempotencyMemoryStore() {
  const rows = new Map<string, WakeRow>();

  function uniqueCompletedInHour(now: number): number {
    return [...rows.values()].filter(
      (row) =>
        row.status === "completed" &&
        row.firstCompletedAt != null &&
        row.firstCompletedAt >= now - SUPERVISION_WAKE_HOUR_MS,
    ).length;
  }

  return {
    uniqueCompletedInHour,
    claim(key: string, nowIso: string): WakeIdempotencyClaim {
      const now = Date.parse(nowIso);
      const existing = rows.get(key);
      if (existing && existing.expiresAt > now) {
        if (existing.status === "completed") {
          return {
            kind: "replay",
            status: existing.responseStatus ?? 200,
            body: existing.responseBody,
          };
        }
        return { kind: "in_progress" };
      }
      if (uniqueCompletedInHour(now) >= SUPERVISION_WAKE_UNIQUE_SUCCESS_PER_HOUR) {
        return { kind: "hour_cap" };
      }
      rows.set(key, {
        idempotencyKey: key,
        createdAt: now,
        expiresAt: now + SUPERVISION_WAKE_IDEMPOTENCY_TTL_MS,
        status: "in_progress",
        firstCompletedAt: null,
        responseStatus: null,
        responseBody: null,
      });
      return { kind: "fresh" };
    },
    complete(
      key: string,
      status: number,
      body: unknown,
      nowIso: string,
    ): { ok: true } {
      const now = Date.parse(nowIso);
      const existing = rows.get(key);
      if (!existing) {
        throw new Error("WAKE_KEY_UNKNOWN");
      }
      existing.status = "completed";
      existing.responseStatus = status;
      existing.responseBody = body;
      if (existing.firstCompletedAt == null) existing.firstCompletedAt = now;
      rows.set(key, existing);
      return { ok: true };
    },
  };
}

export type WakeIdempotencyMemoryStore = ReturnType<
  typeof createWakeIdempotencyMemoryStore
>;
