/**
 * Public application origin for verification (and later reset) links.
 * Production requires an explicit non-localhost NEXT_PUBLIC_SITE_URL.
 */

import { siteConfig } from "@/config/site";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function isHttpOrigin(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    if (parsed.pathname !== "/" && parsed.pathname !== "") return false;
    if (parsed.search || parsed.hash) return false;
    return true;
  } catch {
    return false;
  }
}

function isLocalhostOrigin(value: string): boolean {
  try {
    const host = new URL(value).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

/**
 * Resolve the allowlisted public origin used in email links.
 * Returns null when production config is unsafe / missing.
 */
export function resolvePublicAppOrigin(): string | null {
  const raw = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    siteConfig.url ||
    ""
  ).trim();
  if (!raw) return null;
  const origin = stripTrailingSlash(raw);
  if (!isHttpOrigin(origin)) return null;

  const production = process.env.NODE_ENV === "production";
  if (production && isLocalhostOrigin(origin)) return null;
  if (production && !process.env.NEXT_PUBLIC_SITE_URL?.trim()) return null;

  return origin;
}

export function buildEmailVerificationUrl(rawToken: string): string | null {
  const origin = resolvePublicAppOrigin();
  if (!origin) return null;
  const url = new URL("/verify-email", `${origin}/`);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

export function buildPasswordResetUrl(rawToken: string): string | null {
  const origin = resolvePublicAppOrigin();
  if (!origin) return null;
  const url = new URL("/reset-password", `${origin}/`);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

/** Project Claim recovery — guest pay → later authenticated claim. */
export function buildProjectClaimUrl(
  rawToken: string,
  campaignId: string,
): string | null {
  const origin = resolvePublicAppOrigin();
  if (!origin) return null;
  const url = new URL("/claim-project", `${origin}/`);
  url.searchParams.set("token", rawToken);
  url.searchParams.set("campaignId", campaignId);
  return url.toString();
}
