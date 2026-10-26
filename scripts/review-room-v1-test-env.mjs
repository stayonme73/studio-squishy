/**
 * Shared dev base URL + Playwright cookie host for review-room-v1 disposable scripts.
 */

export const DEFAULT_DEV_BASE = "http://127.0.0.1:3475";

export function resolveVerifyBaseUrl() {
  const fromEnv = process.env.VERIFY_BASE_URL ?? process.env.STUDIO_BASE_URL;
  if (fromEnv && /:3476\b/.test(fromEnv)) {
    return DEFAULT_DEV_BASE;
  }
  return fromEnv ?? DEFAULT_DEV_BASE;
}

/** Hostname for session cookies (localhost vs 127.0.0.1). */
export function cookieHostnameFromBase(baseUrl) {
  return new URL(baseUrl).hostname;
}

export function sessionCookiePlaywright(baseUrl, sessionValue) {
  return {
    name: "studio_session",
    value: sessionValue,
    domain: cookieHostnameFromBase(baseUrl),
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  };
}
