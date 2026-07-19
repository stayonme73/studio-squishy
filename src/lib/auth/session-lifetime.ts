/**
 * Session lifetime — cookie maxAge and server-side issuedAt TTL must match.
 */

/** Seven days in seconds (cookie maxAge). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Seven days in milliseconds (issuedAt validation). */
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
