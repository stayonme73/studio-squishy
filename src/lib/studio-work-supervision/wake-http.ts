import {
  SUPERVISION_AUTH_HEADER,
  SUPERVISION_IDEMPOTENCY_HEADER,
  SUPERVISION_SWEEP_PATH,
} from "./contract";
import { createSupervisionLiveClient } from "./postgres-live-client";
import { resolveSupervisionPostgresConfig } from "./provider-class";
import { DurablePersistenceUnavailableError } from "./repository";
import {
  isSupervisionStoreFailure,
  runSupervisionSweepOnce,
  type SanitizedSweepJson,
} from "./run-sweep-once";
import { authorizeSupervisionService } from "./service-auth";
import {
  SUPERVISION_WAKE_PROVIDER_RATE_LIMIT,
  type WakeIdempotencyClaim,
} from "./wake-idempotency";

export { SUPERVISION_WAKE_PROVIDER_RATE_LIMIT };

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
} as const;

export type WakeHandlerDeps = {
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  fetch?: typeof fetch;
  claimWake?: (key: string, nowIso: string) => Promise<WakeIdempotencyClaim>;
  completeWake?: (
    key: string,
    status: number,
    body: unknown,
    nowIso: string,
  ) => Promise<{ ok: true }>;
  runSweep?: () => Promise<SanitizedSweepJson>;
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function pathnameOf(request: Request): string {
  try {
    return new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "/";
  }
}

function hasQueryString(request: Request): boolean {
  try {
    return new URL(request.url).search.length > 1;
  } catch {
    return false;
  }
}

function liveWakeClient(env: NodeJS.ProcessEnv, fetchFn?: typeof fetch) {
  const resolved = resolveSupervisionPostgresConfig(env);
  if (!resolved.ok) {
    throw new DurablePersistenceUnavailableError(
      `Launch supervision requires Supabase Postgres. Missing ${resolved.missing.join(", ")}.`,
    );
  }
  return createSupervisionLiveClient(resolved.config, { fetch: fetchFn });
}

export async function handleWakeRequest(
  request: Request,
  deps: WakeHandlerDeps = {},
): Promise<Response> {
  const env = deps.env ?? process.env;
  const path = pathnameOf(request);
  const method = request.method.toUpperCase();

  if (path !== SUPERVISION_SWEEP_PATH) {
    return jsonResponse(404, { error: "not_found" });
  }
  if (method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }
  if (hasQueryString(request)) {
    return jsonResponse(400, { error: "query_string_not_allowed" });
  }

  const auth = authorizeSupervisionService(request);
  if (!auth.ok) {
    return jsonResponse(auth.status, { error: auth.error });
  }

  const idempotencyKey = request.headers.get(SUPERVISION_IDEMPOTENCY_HEADER)?.trim() ?? "";
  if (!idempotencyKey) {
    return jsonResponse(400, { error: "idempotency_key_required" });
  }

  const nowIso = (deps.now ? deps.now() : new Date()).toISOString();

  try {
    const claimFn =
      deps.claimWake ??
      ((key: string, at: string) =>
        liveWakeClient(env, deps.fetch).claimWakeIdempotency(key, at));
    const claimed = await claimFn(idempotencyKey, nowIso);

    if (claimed.kind === "replay") {
      return jsonResponse(claimed.status, claimed.body);
    }
    if (claimed.kind === "in_progress") {
      return jsonResponse(409, { error: "wake_in_progress" });
    }
    if (claimed.kind === "hour_cap") {
      return jsonResponse(429, { error: "sweep_rate_limited" });
    }

    const sweepJson = deps.runSweep
      ? await deps.runSweep()
      : await runSupervisionSweepOnce({
          env,
          fetch: deps.fetch,
          holderId: "wake-runtime",
        });

    const completeFn =
      deps.completeWake ??
      ((key: string, status: number, body: unknown, at: string) =>
        liveWakeClient(env, deps.fetch).completeWakeIdempotency(key, status, body, at));
    await completeFn(idempotencyKey, 200, sweepJson, nowIso);
    return jsonResponse(200, sweepJson);
  } catch (error) {
    if (isSupervisionStoreFailure(error)) {
      return jsonResponse(503, { error: "supervision_store_unavailable" });
    }
    return jsonResponse(503, { error: "supervision_store_unavailable" });
  }
}

void SUPERVISION_AUTH_HEADER;
