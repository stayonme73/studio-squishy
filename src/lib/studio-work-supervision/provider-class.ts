export type SupervisionRepositoryKind =
  | "memory"
  | "durable-file"
  | "supabase-postgres";

export const SUPERVISION_PROVIDER_CLASS = {
  memory: "unit-tests-only",
  "durable-file": "local-development-and-controlled-certification-only",
  "supabase-postgres": "launch-production-shared-durable-store",
} as const;

export const SUPERVISION_JSON_PROVIDER = "studio-data-json" as const;
export const SUPERVISION_POSTGRES_PROVIDER = "supabase-postgres" as const;

export const SUPERVISION_POSTGRES_SCHEMA_VERSION = 2 as const;

export const SUPERVISION_SB_SECRET_PREFIX = "sb_secret_" as const;

export type SupervisionSecretKeyKind = "sb_secret" | "legacy_jwt_service_role";

export const SUPERVISION_LAUNCH_ENV_KEYS = {
  url: "STUDIO_SUPERVISION_SUPABASE_URL",
  urlFallback: "NEXT_PUBLIC_SUPABASE_URL",
  secret: "STUDIO_SUPERVISION_SUPABASE_SECRET_KEY",
  serviceRole: "STUDIO_SUPERVISION_SUPABASE_SERVICE_ROLE_KEY",
  serviceRoleFallback: "SUPABASE_SERVICE_ROLE_KEY",
  runtime: "STUDIO_SUPERVISION_RUNTIME",
  provider: "STUDIO_SUPERVISION_PROVIDER",
} as const;

export function classifySupervisionSecretKey(value: string): SupervisionSecretKeyKind {
  return value.startsWith(SUPERVISION_SB_SECRET_PREFIX)
    ? "sb_secret"
    : "legacy_jwt_service_role";
}

export function supervisionRestHeaders(
  key: string,
  kind: SupervisionSecretKeyKind = classifySupervisionSecretKey(key),
): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: key,
    "content-type": "application/json",
    Accept: "application/json",
  };
  if (kind === "legacy_jwt_service_role") {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

export type LaunchRuntimeHints = {
  globalRef?: typeof globalThis;
  cwd?: string;
};

type DenoEnvReader = {
  env?: { get?: (key: string) => string | undefined };
};

const LAUNCH_ENV_KEY_CANDIDATES = [
  SUPERVISION_LAUNCH_ENV_KEYS.url,
  SUPERVISION_LAUNCH_ENV_KEYS.urlFallback,
  SUPERVISION_LAUNCH_ENV_KEYS.secret,
  SUPERVISION_LAUNCH_ENV_KEYS.serviceRole,
  SUPERVISION_LAUNCH_ENV_KEYS.serviceRoleFallback,
  SUPERVISION_LAUNCH_ENV_KEYS.runtime,
  SUPERVISION_LAUNCH_ENV_KEYS.provider,
  "NETLIFY",
  "NODE_ENV",
  "NEXT_RUNTIME",
] as const;

function processEnvOrEmpty(env?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (env) return env;
  if (typeof process !== "undefined" && process.env) return process.env;
  return {} as NodeJS.ProcessEnv;
}

/** Fill only missing known launch keys from Deno.env. Never log values. */
export function mergeLaunchRuntimeEnv(
  env: NodeJS.ProcessEnv = processEnvOrEmpty(),
  hints?: LaunchRuntimeHints,
): NodeJS.ProcessEnv {
  const merged: Record<string, string | undefined> = { ...env };
  const globalRef = hints?.globalRef ?? globalThis;
  const get = (globalRef as { Deno?: DenoEnvReader }).Deno?.env?.get;
  if (typeof get !== "function") return merged as NodeJS.ProcessEnv;
  for (const key of LAUNCH_ENV_KEY_CANDIDATES) {
    if (envValue(merged as NodeJS.ProcessEnv, key)) continue;
    const fromDeno = get(key);
    if (fromDeno && fromDeno.trim()) merged[key] = fromDeno;
  }
  return merged as NodeJS.ProcessEnv;
}

export function isLaunchRuntime(
  env: NodeJS.ProcessEnv = process.env,
  hints?: LaunchRuntimeHints,
): boolean {
  if (env.STUDIO_SUPERVISION_RUNTIME === "launch") return true;
  if (env.NETLIFY === "true" || env.NETLIFY === "1") return true;
  if (env.NEXT_RUNTIME === "edge") return true;
  if (env.NODE_ENV === "production") return true;

  const globalRef = hints?.globalRef ?? globalThis;
  const deno = (globalRef as { Deno?: unknown }).Deno;
  const edgeRuntime = (globalRef as { EdgeRuntime?: unknown }).EdgeRuntime;
  if (typeof deno !== "undefined") return true;
  if (typeof edgeRuntime === "string" || typeof edgeRuntime === "boolean") {
    return true;
  }

  const cwd =
    hints?.cwd ?? (typeof process.cwd === "function" ? process.cwd() : "");
  if (cwd === "/platform" || cwd.startsWith("/platform/")) return true;

  return false;
}

export function envValue(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key]?.trim();
  if (!value) return undefined;
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export type SupervisionPostgresConfig = {
  url: string;
  serviceRoleKey: string;
  urlKeyUsed: string;
  serviceRoleKeyName: string;
  keyKind?: SupervisionSecretKeyKind;
};

export function resolveSupervisionPostgresConfig(
  env: NodeJS.ProcessEnv = processEnvOrEmpty(),
  hints?: LaunchRuntimeHints,
): { ok: true; config: SupervisionPostgresConfig } | { ok: false; missing: string[] } {
  const resolvedEnv = mergeLaunchRuntimeEnv(env, hints);
  const url =
    envValue(resolvedEnv, SUPERVISION_LAUNCH_ENV_KEYS.url) ??
    envValue(resolvedEnv, SUPERVISION_LAUNCH_ENV_KEYS.urlFallback);
  const serviceRoleKey =
    envValue(resolvedEnv, SUPERVISION_LAUNCH_ENV_KEYS.secret) ??
    envValue(resolvedEnv, SUPERVISION_LAUNCH_ENV_KEYS.serviceRole) ??
    envValue(resolvedEnv, SUPERVISION_LAUNCH_ENV_KEYS.serviceRoleFallback);
  const missing: string[] = [];
  if (!url) {
    missing.push(
      `${SUPERVISION_LAUNCH_ENV_KEYS.url} (or ${SUPERVISION_LAUNCH_ENV_KEYS.urlFallback})`,
    );
  }
  if (!serviceRoleKey) {
    missing.push(
      `${SUPERVISION_LAUNCH_ENV_KEYS.secret} (or ${SUPERVISION_LAUNCH_ENV_KEYS.serviceRole} / ${SUPERVISION_LAUNCH_ENV_KEYS.serviceRoleFallback})`,
    );
  }
  if (!url || !serviceRoleKey) return { ok: false, missing };
  const serviceRoleKeyName = envValue(resolvedEnv, SUPERVISION_LAUNCH_ENV_KEYS.secret)
    ? SUPERVISION_LAUNCH_ENV_KEYS.secret
    : envValue(resolvedEnv, SUPERVISION_LAUNCH_ENV_KEYS.serviceRole)
      ? SUPERVISION_LAUNCH_ENV_KEYS.serviceRole
      : SUPERVISION_LAUNCH_ENV_KEYS.serviceRoleFallback;
  return {
    ok: true,
    config: {
      url: url.replace(/\/$/, ""),
      serviceRoleKey,
      urlKeyUsed: envValue(resolvedEnv, SUPERVISION_LAUNCH_ENV_KEYS.url)
        ? SUPERVISION_LAUNCH_ENV_KEYS.url
        : SUPERVISION_LAUNCH_ENV_KEYS.urlFallback,
      serviceRoleKeyName,
      keyKind: classifySupervisionSecretKey(serviceRoleKey),
    },
  };
}

export function requestedSupervisionProvider(
  env: NodeJS.ProcessEnv = process.env,
): SupervisionRepositoryKind | null {
  const value = envValue(env, SUPERVISION_LAUNCH_ENV_KEYS.provider);
  if (value === "memory" || value === "durable-file" || value === "supabase-postgres") {
    return value;
  }
  return null;
}
