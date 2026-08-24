import {
  SUPERVISION_POSTGRES_PROVIDER,
  SUPERVISION_POSTGRES_SCHEMA_VERSION,
  classifySupervisionSecretKey,
  supervisionRestHeaders,
  type SupervisionPostgresConfig,
} from "./provider-class";
import type { SupervisionQueuedOp } from "./postgres-rpc";
import {
  DurablePersistenceUnavailableError,
  LiveStoreUnhealthyError,
  SchemaMismatchError,
  type HeartbeatRecord,
  type SweepClaim,
} from "./repository";
import {
  SUPERVISION_CLAIM_WAKE_IDEMPOTENCY_RPC,
  SUPERVISION_COMPLETE_WAKE_IDEMPOTENCY_RPC,
  type WakeIdempotencyClaim,
} from "./wake-idempotency";
import type { IncidentEvent, MachineIncident, ProviderPortStatus, WorkLease } from "./types";

export type SupervisionLiveRequestLog = {
  method: string;
  path: string;
  rpc: string | null;
  hasApikey: boolean;
  hasAuthorization: boolean;
};

function restHeaders(config: SupervisionPostgresConfig): Record<string, string> {
  return supervisionRestHeaders(
    config.serviceRoleKey,
    config.keyKind ?? classifySupervisionSecretKey(config.serviceRoleKey),
  );
}

function safeStoreError(status: number, path: string, code: string): never {
  throw new DurablePersistenceUnavailableError(
    `Supervision store ${code} (HTTP ${status}) at ${path}`,
  );
}

function assertNoSecret(text: string, serviceRoleKey: string): void {
  if (serviceRoleKey && text.includes(serviceRoleKey)) {
    throw new Error("Supervision store error leaked a credential.");
  }
}

export function createSupervisionLiveClient(
  config: SupervisionPostgresConfig,
  options?: { fetch?: typeof fetch; requestLog?: SupervisionLiveRequestLog[] },
) {
  const fetchFn = options?.fetch ?? fetch;
  const log = options?.requestLog;

  async function request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: unknown }> {
    const rpc = path.includes("/rpc/") ? path.slice(path.lastIndexOf("/") + 1) : null;
    const headers = restHeaders(config);
    log?.push({
      method,
      path,
      rpc,
      hasApikey: Object.prototype.hasOwnProperty.call(headers, "apikey"),
      hasAuthorization: Object.prototype.hasOwnProperty.call(headers, "Authorization"),
    });
    let res: Response;
    try {
      res = await fetchFn(`${config.url}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new LiveStoreUnhealthyError("Supervision Postgres is unavailable.");
    }
    const text = await res.text();
    assertNoSecret(text, config.serviceRoleKey);
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        json = { error: "non-json" };
      }
    }
    return { status: res.status, json };
  }

  async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const path = `/rest/v1/rpc/${name}`;
    const { status, json } = await request("POST", path, args);
    const dbError =
      json && typeof json === "object"
        ? String(
            (json as { message?: string; error?: string; code?: string }).message ??
              (json as { error?: string }).error ??
              (json as { code?: string }).code ??
              "",
          )
        : "";
    if (dbError.includes("TENANT_ISOLATION")) {
      throw new Error("Heartbeat customer does not match the lease.");
    }
    if (dbError.includes("APPEND_ONLY")) {
      throw new Error("Incident events cannot be overwritten or deleted.");
    }
    if (status === 401 || status === 403) {
      safeStoreError(status, path, "AUTH_FAILED");
    }
    if (status === 409 || (json && typeof json === "object" && (json as { ok?: boolean }).ok === false && name === "supervision_verify_schema")) {
      throw new SchemaMismatchError();
    }
    if (status >= 500) {
      throw new LiveStoreUnhealthyError("Supervision Postgres RPC failed.");
    }
    if (status < 200 || status >= 300) {
      safeStoreError(status, path, "RPC_FAILED");
    }
    return json as T;
  }

  async function verifySchema(): Promise<{
    ok: true;
    schemaVersion: number;
    provider: string;
  }> {
    const verified = await rpc<{
      ok: boolean;
      schemaVersion: number;
      provider: string;
      expected: number;
    }>("supervision_verify_schema");
    if (
      !verified?.ok ||
      verified.schemaVersion !== SUPERVISION_POSTGRES_SCHEMA_VERSION ||
      verified.provider !== SUPERVISION_POSTGRES_PROVIDER
    ) {
      throw new SchemaMismatchError();
    }
    return {
      ok: true,
      schemaVersion: verified.schemaVersion,
      provider: verified.provider,
    };
  }

  async function pingHealth(): Promise<void> {
    const health = await pingMeta();
    if (health.status === 401 || health.status === 403) {
      throw new DurablePersistenceUnavailableError(
        `Supervision store AUTH_FAILED (HTTP ${health.status}) at /rest/v1/supervision_meta`,
      );
    }
    if (health.status < 200 || health.status >= 300) {
      throw new LiveStoreUnhealthyError("Supervision Postgres health check failed.");
    }
  }

  async function pingMeta(): Promise<{ status: number }> {
    const { status } = await request(
      "GET",
      "/rest/v1/supervision_meta?select=schema_version,provider",
    );
    return { status };
  }

  return {
    provider: SUPERVISION_POSTGRES_PROVIDER,
    urlKeyUsed: config.urlKeyUsed,
    serviceRoleKeyName: config.serviceRoleKeyName,
    verifySchema,
    pingHealth,
    async initialize(): Promise<void> {
      await verifySchema();
      await pingHealth();
    },
    async hydrate() {
      return rpc<Record<string, unknown>>("supervision_hydrate");
    },
    async dueNextChecks(at: string) {
      return rpc<{ leaseIds: string[]; incidentIds: string[] }>("supervision_due_next_checks", {
        p_at: at,
      });
    },
    async upsertLease(lease: WorkLease) {
      return rpc("supervision_upsert_lease", { p_lease: lease });
    },
    async acceptHeartbeat(lease: WorkLease, heartbeat: HeartbeatRecord) {
      return rpc<{ accepted: boolean }>("supervision_accept_heartbeat", {
        p_lease: lease,
        p_heartbeat: heartbeat,
      });
    },
    async upsertIncidentWithEvents(incident: MachineIncident, events: IncidentEvent[]) {
      return rpc("supervision_upsert_incident_with_events", {
        p_incident: incident,
        p_events: events,
      });
    },
    async tryClaimSweep(input: {
      claimId: string;
      holder: string;
      at: string;
      ttlMs: number;
    }): Promise<{ claimed: boolean; claim: SweepClaim | null }> {
      return rpc("supervision_try_claim_sweep", {
        p_claim_id: input.claimId,
        p_holder: input.holder,
        p_at: input.at,
        p_ttl_ms: input.ttlMs,
      });
    },
    async recordSweepEvaluation(
      evaluation: { evaluationId: string; claimId: string; at: string; leaseId: string; incidentId: string | null; health: string },
      lease?: WorkLease,
    ) {
      return rpc("supervision_record_sweep_evaluation", {
        p_evaluation: evaluation,
        p_lease: lease ?? null,
      });
    },
    async saveCoverage(providers: readonly ProviderPortStatus[]) {
      return rpc("supervision_save_coverage", { p_providers: providers });
    },
    async markRestored(at: string) {
      return rpc("supervision_mark_restored", { p_at: at });
    },
    async applyOps(ops: SupervisionQueuedOp[]) {
      return rpc<{ ok: boolean; results: unknown[] }>("supervision_apply_ops", { p_ops: ops });
    },
    async claimWakeIdempotency(key: string, nowIso: string): Promise<WakeIdempotencyClaim> {
      return rpc<WakeIdempotencyClaim>(SUPERVISION_CLAIM_WAKE_IDEMPOTENCY_RPC, {
        p_key: key,
        p_now: nowIso,
      });
    },
    async completeWakeIdempotency(
      key: string,
      status: number,
      body: unknown,
      nowIso: string,
    ): Promise<{ ok: true }> {
      return rpc<{ ok: true }>(SUPERVISION_COMPLETE_WAKE_IDEMPOTENCY_RPC, {
        p_key: key,
        p_status: status,
        p_body: body,
        p_now: nowIso,
      });
    },
    pingMeta,
  };
}

export type SupervisionLiveClient = ReturnType<typeof createSupervisionLiveClient>;
