import type { StudioUser } from "@/lib/campaign-store/types";
import {
  SESSION_MAX_AGE_MS,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session-lifetime";

export const SESSION_COOKIE_NAME = "studio_session";

export type SessionPayload = {
  userId: string;
  email: string;
  displayName: string;
  roles: StudioUser["roles"];
  currentCampaignId?: string;
  clientCampaignIds?: readonly string[];
  /** ISO timestamp or null — truthful soft/hard verification state. */
  emailVerifiedAt?: string | null;
  issuedAt: number;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64url"));
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(payloadJson: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadJson));
  return toBase64Url(new Uint8Array(signature));
}

async function verifySignature(
  payloadJson: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const key = await importHmacKey(secret);
  const encoder = new TextEncoder();
  const signatureBytes = new Uint8Array(Buffer.from(signature, "base64url"));
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(payloadJson),
  );
}

export async function createSessionToken(user: StudioUser): Promise<string> {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: [...user.roles],
    currentCampaignId: user.currentCampaignId,
    clientCampaignIds: user.clientCampaignIds ? [...user.clientCampaignIds] : undefined,
    emailVerifiedAt:
      user.emailVerifiedAt === undefined ? null : user.emailVerifiedAt,
    issuedAt: Date.now(),
  };
  const payloadJson = JSON.stringify(payload);
  const signature = await signPayload(payloadJson, getSessionSecret());
  return `${toBase64Url(new TextEncoder().encode(payloadJson))}.${signature}`;
}

export async function parseSessionToken(token: string): Promise<SessionPayload | null> {
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) return null;

  const payloadJson = new TextDecoder().decode(fromBase64Url(payloadPart));
  const valid = await verifySignature(payloadJson, signature, getSessionSecret());
  if (!valid) return null;

  try {
    const payload = JSON.parse(payloadJson) as SessionPayload;
    if (
      typeof payload.issuedAt !== "number" ||
      !Number.isFinite(payload.issuedAt) ||
      payload.issuedAt <= 0
    ) {
      return null;
    }
    if (Date.now() - payload.issuedAt > SESSION_MAX_AGE_MS) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function sessionPayloadToUser(payload: SessionPayload): StudioUser {
  return {
    id: payload.userId,
    email: payload.email,
    displayName: payload.displayName,
    roles: payload.roles,
    currentCampaignId: payload.currentCampaignId,
    clientCampaignIds: payload.clientCampaignIds,
    emailVerifiedAt:
      payload.emailVerifiedAt === undefined ? null : payload.emailVerifiedAt,
  };
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Clear the session cookie — same flags as issue, maxAge 0. */
export function clearSessionCookieOptions() {
  return sessionCookieOptions(0);
}

export async function readSessionFromCookieHeader(
  cookieHeader: string | null | undefined,
): Promise<StudioUser | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!match) return null;

  const token = decodeURIComponent(match.slice(SESSION_COOKIE_NAME.length + 1));
  const payload = await parseSessionToken(token);
  if (!payload) return null;
  return sessionPayloadToUser(payload);
}

export async function readSessionFromRequest(request: Request): Promise<StudioUser | null> {
  return readSessionFromCookieHeader(request.headers.get("cookie"));
}

/** Test helper — bypass cookie when SESSION_SECRET unavailable in unit tests. */
export function isSessionConfigured(): boolean {
  return Boolean(process.env.SESSION_SECRET);
}
