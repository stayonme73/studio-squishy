/**
 * Allowlisted post-auth return paths — never external redirects.
 */

export const SAFE_RETURN_PATHS = new Set([
  "/studio-board",
  "/feedback-studio",
  "/review-room",
  "/deliverables",
  "/help-center",
  "/verify-email/pending",
]);

export function safeReturnPath(
  value: string | null | undefined,
  fallback = "/studio-board",
): string {
  if (!value) return fallback;
  const [pathname] = value.split("?");
  if (pathname.startsWith("/") && !pathname.startsWith("//") && SAFE_RETURN_PATHS.has(pathname)) {
    return value;
  }
  return fallback;
}
