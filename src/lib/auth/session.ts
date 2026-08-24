import { findUserById } from "@/lib/auth/users";
import type { StudioUser } from "@/lib/campaign-store/types";
import {
  isIssuedAtInvalidatedByPasswordChange,
  parseSessionToken,
  readSessionTokenFromCookieHeader,
  sessionPayloadToUser,
  type SessionPayload,
} from "@/lib/auth/session-cookie";

export {
  SESSION_COOKIE_NAME,
  clearSessionCookieOptions,
  createSessionToken,
  isIssuedAtInvalidatedByPasswordChange,
  isSessionConfigured,
  parseSessionToken,
  readSessionTokenFromCookieHeader,
  sessionCookieOptions,
  sessionPayloadToUser,
  type SessionPayload,
} from "@/lib/auth/session-cookie";

async function isSessionInvalidatedByPasswordChange(
  payload: SessionPayload,
): Promise<boolean> {
  const record = await findUserById(payload.userId);
  return isIssuedAtInvalidatedByPasswordChange(
    payload.issuedAt,
    record?.passwordChangedAtMs,
  );
}

export async function readSessionFromCookieHeader(
  cookieHeader: string | null | undefined,
): Promise<StudioUser | null> {
  const token = readSessionTokenFromCookieHeader(cookieHeader);
  if (!token) return null;

  const payload = await parseSessionToken(token);
  if (!payload) return null;
  if (await isSessionInvalidatedByPasswordChange(payload)) return null;
  return sessionPayloadToUser(payload);
}

export async function readSessionFromRequest(request: Request): Promise<StudioUser | null> {
  return readSessionFromCookieHeader(request.headers.get("cookie"));
}
