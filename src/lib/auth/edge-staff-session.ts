/**
 * Edge-safe staff session lookup for Netlify/Deno proxy.
 *
 * Always uses the immutable bundled hashed staff identity.
 * Never imports the JSON user repository or Node filesystem.
 * Selection does not depend on NODE_ENV — this module is the Edge path.
 */

import type { StudioUser } from "@/lib/campaign-store/types";
import { normalizeEmail } from "@/lib/auth/email-normalize";
import {
  findBundledStaffById,
  toPublicStaffUser,
} from "@/lib/auth/bundled-staff-identity";
import {
  isIssuedAtInvalidatedByPasswordChange,
  parseSessionToken,
  readSessionTokenFromCookieHeader,
} from "@/lib/auth/session-cookie";

export type EdgeSafeRuntimeHints = {
  env?: NodeJS.ProcessEnv;
  globalRef?: typeof globalThis;
  cwd?: string;
};

/**
 * Filesystem identity is unsafe on Edge/Deno/Netlify regardless of NODE_ENV.
 * Proxy does not use this to choose a JSON fallback — it only documents the
 * runtime that must stay on bundled staff.
 */
export function isFilesystemIdentityUnsafeRuntime(
  hints: EdgeSafeRuntimeHints = {},
): boolean {
  const env = hints.env ?? process.env;
  const globalRef = hints.globalRef ?? globalThis;
  const cwd = hints.cwd ?? (typeof process.cwd === "function" ? process.cwd() : "");
  const deno = (globalRef as { Deno?: unknown }).Deno;
  const edgeRuntime = (globalRef as { EdgeRuntime?: unknown }).EdgeRuntime;
  if (typeof deno !== "undefined") return true;
  if (typeof edgeRuntime === "string" || typeof edgeRuntime === "boolean") {
    return true;
  }
  if (env.NEXT_RUNTIME === "edge") return true;
  if (env.NETLIFY === "true" || env.NETLIFY === "1") return true;
  if (cwd === "/platform" || cwd.startsWith("/platform/")) return true;
  return false;
}

export async function readEdgeSafeSessionFromCookieHeader(
  cookieHeader: string | null | undefined,
): Promise<StudioUser | null> {
  const token = readSessionTokenFromCookieHeader(cookieHeader);
  if (!token) return null;

  const payload = await parseSessionToken(token);
  if (!payload) return null;

  const staff = findBundledStaffById(payload.userId);
  if (!staff) return null;
  if (normalizeEmail(staff.email) !== normalizeEmail(payload.email)) {
    return null;
  }
  if (
    isIssuedAtInvalidatedByPasswordChange(
      payload.issuedAt,
      staff.passwordChangedAtMs,
    )
  ) {
    return null;
  }

  const publicStaff = toPublicStaffUser(staff);
  return {
    ...publicStaff,
    currentCampaignId: payload.currentCampaignId,
    clientCampaignIds: payload.clientCampaignIds,
    emailVerifiedAt:
      payload.emailVerifiedAt === undefined
        ? publicStaff.emailVerifiedAt
        : payload.emailVerifiedAt,
  };
}
