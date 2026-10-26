/**
 * STUDIO-DURABLE-PERSISTENCE-INTEGRATION-1 — verify test DB target before writes.
 * Never logs connection strings or passwords.
 */

export function extractSupabaseProjectRefFromDatabaseUrl(url: string): string | null {
  try {
    const normalized = url.replace(/^postgresql:/i, "http:");
    const parsed = new URL(normalized);
    const user = decodeURIComponent(parsed.username);
    const poolerMatch = user.match(/^postgres\.([a-z0-9]+)$/i);
    if (poolerMatch?.[1]) return poolerMatch[1];
    return null;
  } catch {
    return null;
  }
}

export type StudioPersistenceTargetVerification = {
  ok: boolean;
  reason: string;
  projectRef?: string;
};

/** Confirms URI matches the Owner-declared test project ref and not the production ref. */
export function verifyStudioPersistenceTestTarget(
  source: Record<string, string | undefined> = process.env,
): StudioPersistenceTargetVerification {
  const url = source.STUDIO_PERSISTENCE_TEST_DATABASE_URL?.trim();
  const expectedTestRef = source.STUDIO_PERSISTENCE_TEST_PROJECT_REF?.trim();
  const forbiddenProductionRef = source.STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF?.trim();

  if (!url) {
    return { ok: false, reason: "STUDIO_PERSISTENCE_TEST_DATABASE_URL is not set." };
  }
  if (!expectedTestRef) {
    return {
      ok: false,
      reason:
        "STUDIO_PERSISTENCE_TEST_PROJECT_REF is not set (non-secret ref from Studio Persistence Test dashboard URL).",
    };
  }

  const ref = extractSupabaseProjectRefFromDatabaseUrl(url);
  if (!ref) {
    return {
      ok: false,
      reason:
        "Could not parse Supabase project ref from database URL (expected Session pooler URI user postgres.<project-ref>).",
    };
  }

  if (ref !== expectedTestRef) {
    return {
      ok: false,
      reason:
        "Database URL project ref does not match STUDIO_PERSISTENCE_TEST_PROJECT_REF.",
      projectRef: ref,
    };
  }

  if (forbiddenProductionRef && ref === forbiddenProductionRef) {
    return {
      ok: false,
      reason: "Target ref matches STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF (forbidden).",
      projectRef: ref,
    };
  }

  if (forbiddenProductionRef && url.includes(forbiddenProductionRef)) {
    return {
      ok: false,
      reason: "Database URL contains forbidden production project ref.",
      projectRef: ref,
    };
  }

  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  if (!isLocal && !url.includes("pooler.supabase.com")) {
    return {
      ok: false,
      reason: "Expected Supabase Session pooler host (pooler.supabase.com) or localhost.",
      projectRef: ref,
    };
  }

  return {
    ok: true,
    reason: "Target verified for Studio Persistence Test (ref match).",
    projectRef: ref,
  };
}
