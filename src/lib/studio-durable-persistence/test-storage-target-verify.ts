/**
 * STUDIO-PRELAUNCH-INFRASTRUCTURE-COMPLETION-1 — verify Storage targets test project only.
 * Never logs secret values.
 */

export type StudioStorageTargetVerification = {
  ok: boolean;
  reason: string;
  projectRef?: string;
};

function extractRefFromSupabaseUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    const projectHost = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    if (projectHost?.[1]) return projectHost[1];
    return null;
  } catch {
    return null;
  }
}

/** Confirms Storage URL matches STUDIO_PERSISTENCE_TEST_PROJECT_REF and not production ref. */
export function verifyStudioPersistenceTestStorageTarget(
  source: Record<string, string | undefined> = process.env,
): StudioStorageTargetVerification {
  const url =
    source.STUDIO_PERSISTENCE_TEST_SUPABASE_URL?.trim() ??
    source.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const expectedTestRef = source.STUDIO_PERSISTENCE_TEST_PROJECT_REF?.trim();
  const forbiddenProductionRef = source.STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF?.trim();
  const serviceKey =
    source.STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    source.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket =
    source.STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET?.trim() ??
    source.SUPABASE_STORAGE_BUCKET?.trim();

  if (!url) {
    return {
      ok: false,
      reason:
        "Storage URL not set (STUDIO_PERSISTENCE_TEST_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL).",
    };
  }
  if (!serviceKey) {
    return {
      ok: false,
      reason:
        "Storage service role key not set (STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY).",
    };
  }
  if (!bucket) {
    return {
      ok: false,
      reason:
        "Storage bucket not set (STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET or SUPABASE_STORAGE_BUCKET).",
    };
  }
  if (!expectedTestRef) {
    return {
      ok: false,
      reason: "STUDIO_PERSISTENCE_TEST_PROJECT_REF is not set.",
    };
  }

  const ref = extractRefFromSupabaseUrl(url);
  if (!ref) {
    return {
      ok: false,
      reason: "Could not parse Supabase project ref from Storage URL host.",
    };
  }

  if (ref !== expectedTestRef) {
    return {
      ok: false,
      reason: "Storage URL project ref does not match STUDIO_PERSISTENCE_TEST_PROJECT_REF.",
      projectRef: ref,
    };
  }

  if (forbiddenProductionRef && ref === forbiddenProductionRef) {
    return {
      ok: false,
      reason: "Storage target matches STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF (forbidden).",
      projectRef: ref,
    };
  }

  if (forbiddenProductionRef && url.includes(forbiddenProductionRef)) {
    return {
      ok: false,
      reason: "Storage URL contains forbidden production project ref.",
      projectRef: ref,
    };
  }

  return {
    ok: true,
    reason: "Storage target verified for Studio Persistence Test (ref match).",
    projectRef: ref,
  };
}

export function resolveTestSupabaseStorageEnv(
  source: Record<string, string | undefined> = process.env,
): {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseStorageBucket: string;
} | null {
  const verification = verifyStudioPersistenceTestStorageTarget(source);
  if (!verification.ok) return null;
  return {
    supabaseUrl:
      source.STUDIO_PERSISTENCE_TEST_SUPABASE_URL?.trim() ??
      source.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    supabaseServiceRoleKey:
      source.STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY?.trim() ??
      source.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    supabaseStorageBucket:
      source.STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET?.trim() ??
      source.SUPABASE_STORAGE_BUCKET!.trim(),
  };
}

/**
 * Maps verified Persistence Test Storage env into the keys used by
 * `createServerFileRoomStorageAdapter` / `resolveSupabaseStorageEnv` (no secret logging).
 */
export function applyStudioPersistenceTestSupabaseEnvToProcess(
  source: Record<string, string | undefined> = process.env,
): boolean {
  const env = resolveTestSupabaseStorageEnv(source);
  if (!env) return false;
  source.NEXT_PUBLIC_SUPABASE_URL = env.supabaseUrl;
  source.SUPABASE_SERVICE_ROLE_KEY = env.supabaseServiceRoleKey;
  source.SUPABASE_STORAGE_BUCKET = env.supabaseStorageBucket;
  return true;
}
