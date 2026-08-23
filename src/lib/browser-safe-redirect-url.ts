/**
 * Build a redirect URL browsers can actually open.
 * Never send customers to 0.0.0.0 / :: (listen addresses, not browser hosts).
 */

const UNSAFE_BROWSER_HOSTS = new Set(["0.0.0.0", "::", "[::]"]);

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function hostnameOfHostHeader(host: string): string {
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end >= 0 ? host.slice(0, end + 1) : host;
  }
  return host.split(":")[0] ?? host;
}

/**
 * Absolute URL for a same-origin redirect path, safe for Location headers.
 */
export function browserSafeRedirectUrl(
  request: Request,
  pathname: string,
): URL {
  const incoming = new URL(request.url);
  const forwardedHost = firstHeaderValue(
    request.headers.get("x-forwarded-host"),
  );
  const hostHeader = firstHeaderValue(request.headers.get("host"));
  const preferredHost = forwardedHost || hostHeader || incoming.host;

  const hostname = hostnameOfHostHeader(preferredHost);
  const safeHost = UNSAFE_BROWSER_HOSTS.has(hostname)
    ? preferredHost.replace(hostname, "localhost")
    : preferredHost;

  const forwardedProto = firstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );
  const protocol =
    forwardedProto === "https" || forwardedProto === "http"
      ? `${forwardedProto}:`
      : incoming.protocol;

  const url = new URL(pathname, `${protocol}//${safeHost}`);
  /* Keep query the caller put on `pathname`. Do not copy the incoming request search. */
  url.hash = "";
  if (UNSAFE_BROWSER_HOSTS.has(url.hostname)) {
    url.hostname = "localhost";
  }
  return url;
}
