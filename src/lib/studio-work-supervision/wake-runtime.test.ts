import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SUPERVISION_AUTH_HEADER,
  SUPERVISION_DEV_PROOF_SECRET,
  SUPERVISION_IDEMPOTENCY_HEADER,
  SUPERVISION_SWEEP_PATH,
} from "./contract";
import { LiveStoreUnhealthyError } from "./repository";
import type { SanitizedSweepJson } from "./run-sweep-once";
import { handleWakeRequest } from "./wake-http";
import {
  SUPERVISION_WAKE_PROVIDER_RATE_LIMIT,
  SUPERVISION_WAKE_UNIQUE_SUCCESS_PER_HOUR,
  createWakeIdempotencyMemoryStore,
} from "./wake-idempotency";

const SECRET = "wake-local-proof-secret";
const here = path.dirname(fileURLToPath(import.meta.url));

function fixtureSweep(): SanitizedSweepJson {
  return {
    ok: true,
    path: SUPERVISION_SWEEP_PATH,
    machineComputesHealth: true,
    providersRemainUnconnected: [],
    sweep: {
      evaluatedAt: "2026-08-24T17:00:00.000Z",
      claimed: true,
      claimId: "claim_test",
      skippedBecauseClaimHeld: false,
      leaseHealth: {},
      incidentsOpenedOrUpdated: [],
      recoveries: [],
      overdueNextChecks: [],
      mismatches: [],
      sweepEvaluations: [],
    },
    incidents: [],
  } as SanitizedSweepJson;
}

function sweepRequest(options?: {
  method?: string;
  path?: string;
  secret?: string | null;
  key?: string | null;
  query?: string;
}): Request {
  const headers = new Headers();
  if (options?.secret !== null) {
    headers.set(SUPERVISION_AUTH_HEADER, options?.secret ?? SECRET);
  }
  if (options?.key !== null) {
    headers.set(SUPERVISION_IDEMPOTENCY_HEADER, options?.key ?? "wake-key-1");
  }
  return new Request(
    `https://wake.test${options?.path ?? SUPERVISION_SWEEP_PATH}${options?.query ?? ""}`,
    { method: options?.method ?? "POST", headers },
  );
}

describe("machine-only wake runtime", () => {
  const previousSecret = process.env.STUDIO_OPERATING_SWEEP_SECRET;

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.STUDIO_OPERATING_SWEEP_SECRET;
    else process.env.STUDIO_OPERATING_SWEEP_SECRET = previousSecret;
  });

  it("records durable wake idempotency objects in SQL without applying them", () => {
    const sql = readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260825_supervision_wake_idempotency.sql"),
      "utf8",
    );
    expect(sql).toContain("supervision_wake_idempotency");
    expect(sql).toContain("supervision_claim_wake_idempotency");
    expect(sql).toContain("supervision_complete_wake_idempotency");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("18");
    expect(sql).toContain("NOT APPLIED");
  });

  it("keeps the provider pre-handler cap at 60 requests per IP per minute", () => {
    expect(SUPERVISION_WAKE_PROVIDER_RATE_LIMIT.windowLimit).toBe(60);
    expect(SUPERVISION_WAKE_PROVIDER_RATE_LIMIT.windowSize).toBe(60);
    expect([...SUPERVISION_WAKE_PROVIDER_RATE_LIMIT.aggregateBy]).toEqual(["ip", "domain"]);
  });

  it("returns 404 JSON for GET /", async () => {
    const response = await handleWakeRequest(sweepRequest({ method: "GET", path: "/" }));
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    await expect(response.json()).resolves.toEqual({ error: "not_found" });
  });

  it("returns 405 JSON for the wrong method on the sweep path", async () => {
    process.env.STUDIO_OPERATING_SWEEP_SECRET = SECRET;
    const response = await handleWakeRequest(sweepRequest({ method: "GET" }));
    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({ error: "method_not_allowed" });
  });

  it("returns 401 JSON and does not touch the store for a missing or wrong secret", async () => {
    process.env.STUDIO_OPERATING_SWEEP_SECRET = SECRET;
    let storeTouched = false;
    const deps = {
      claimWake: async () => {
        storeTouched = true;
        return { kind: "fresh" as const };
      },
    };
    const missing = await handleWakeRequest(sweepRequest({ secret: null }), deps);
    const wrong = await handleWakeRequest(sweepRequest({ secret: "nope" }), deps);
    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(storeTouched).toBe(false);
    await expect(missing.json()).resolves.toEqual({ error: "Service authentication failed." });
  });

  it("reaches the controlled test Machine after correct auth", async () => {
    process.env.STUDIO_OPERATING_SWEEP_SECRET = SECRET;
    const store = createWakeIdempotencyMemoryStore();
    const now = () => new Date("2026-08-24T17:00:00.000Z");
    let swept = false;
    const response = await handleWakeRequest(sweepRequest(), {
      now,
      claimWake: async (key, at) => store.claim(key, at),
      completeWake: async (key, status, body, at) => store.complete(key, status, body, at),
      runSweep: async () => {
        swept = true;
        return fixtureSweep();
      },
    });
    expect(response.status).toBe(200);
    expect(swept).toBe(true);
    const body = (await response.json()) as { ok: boolean; path: string };
    expect(body.ok).toBe(true);
    expect(body.path).toBe(SUPERVISION_SWEEP_PATH);
  });

  it("replays a repeated idempotency key without another unique success", async () => {
    process.env.STUDIO_OPERATING_SWEEP_SECRET = SECRET;
    const store = createWakeIdempotencyMemoryStore();
    const now = () => new Date("2026-08-24T17:00:00.000Z");
    let sweeps = 0;
    const deps = {
      now,
      claimWake: async (key: string, at: string) => store.claim(key, at),
      completeWake: async (
        key: string,
        status: number,
        body: unknown,
        at: string,
      ) => store.complete(key, status, body, at),
      runSweep: async () => {
        sweeps += 1;
        return fixtureSweep();
      },
    };
    expect((await handleWakeRequest(sweepRequest({ key: "same-key" }), deps)).status).toBe(200);
    expect((await handleWakeRequest(sweepRequest({ key: "same-key" }), deps)).status).toBe(200);
    expect(sweeps).toBe(1);
    expect(store.uniqueCompletedInHour(now().getTime())).toBe(1);
  });

  it("caps unique successful wakes at 18 per rolling hour", () => {
    const store = createWakeIdempotencyMemoryStore();
    const now = "2026-08-24T17:00:00.000Z";
    for (let i = 0; i < SUPERVISION_WAKE_UNIQUE_SUCCESS_PER_HOUR; i += 1) {
      expect(store.claim(`k-${i}`, now).kind).toBe("fresh");
      store.complete(`k-${i}`, 200, { i }, now);
    }
    expect(store.claim("k-overflow", now)).toEqual({ kind: "hour_cap" });
    expect(store.claim("k-0", now).kind).toBe("replay");
  });

  it("returns sanitized 503 when the store fails after authentication", async () => {
    process.env.STUDIO_OPERATING_SWEEP_SECRET = SECRET;
    const response = await handleWakeRequest(sweepRequest(), {
      claimWake: async () => {
        throw new LiveStoreUnhealthyError("Supervision Postgres is unavailable.");
      },
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "supervision_store_unavailable",
    });
  });

  it("does not ship a repeating timer or a private Studio host call", async () => {
    const source = [
      readFileSync(path.join(here, "wake-http.ts"), "utf8"),
      readFileSync(path.join(here, "run-sweep-once.ts"), "utf8"),
    ].join("\n");
    expect(source).not.toMatch(/setInterval\s*\(/);
    expect(source).not.toMatch(/studio-squishy-app-certification/);
    const response = await handleWakeRequest(
      sweepRequest({ path: "/file-room/incident-command" }),
    );
    expect(response.status).toBe(404);
    void SUPERVISION_DEV_PROOF_SECRET;
  });
});
