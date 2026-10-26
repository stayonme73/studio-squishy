/**
 * Private Owner-desk access checks. The poke panel is not on the desk.
 * Stored poke records remain messages. They do not start Cursor.
 */
import { listOwnerPokes, postOwnerPoke } from "./ops-bridge-messages.mjs";

export const OWNER_DESK_PORT = 4177;
export const PUBLIC_FUNNEL_PORT = 4178;

export function ownerDeskIsOffPublicFunnel() {
  return OWNER_DESK_PORT !== PUBLIC_FUNNEL_PORT;
}

export function authorizeOwnerDeskRequest(input = {}) {
  const ip = String(input.remoteAddress ?? "");
  const loopback = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  const token = typeof input.cookieToken === "string" ? input.cookieToken : "";
  const sessions = input.sessions;
  if (loopback || (token && sessions && typeof sessions.has === "function" && sessions.has(token))) {
    return { ok: true, executed: false, liveAgent: false };
  }
  return { ok: false, reason: "owner_only", executed: false, liveAgent: false };
}

export function ownerCommsDeskFragment() {
  return "";
}

export { listOwnerPokes, postOwnerPoke };
