/**
 * Certification / local-dev sandbox opt-in query.
 * Never the normal customer journey. Must survive Lobby → Conversation Room.
 */
export const STUDIO_PAYMENT_SANDBOX_PARAM = "studioPaymentSandbox" as const;
export const STUDIO_PAYMENT_SANDBOX_FLAG = "1" as const;
export const STUDIO_PAYMENT_SANDBOX_SESSION_KEY =
  "studio-payment:sandbox-opt-in:v1" as const;

export function searchHasStudioPaymentSandbox(
  search: string | null | undefined,
): boolean {
  if (!search) return false;
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  return params.get(STUDIO_PAYMENT_SANDBOX_PARAM) === STUDIO_PAYMENT_SANDBOX_FLAG;
}

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

/** Remember the existing query opt-in for this browser tab. */
export function rememberStudioPaymentSandbox(
  search: string | null | undefined,
): void {
  if (!canUseSessionStorage()) return;
  if (!searchHasStudioPaymentSandbox(search)) return;
  try {
    window.sessionStorage.setItem(
      STUDIO_PAYMENT_SANDBOX_SESSION_KEY,
      STUDIO_PAYMENT_SANDBOX_FLAG,
    );
  } catch {
    /* Private mode / blocked storage — query flag still works. */
  }
}

export function sessionHasStudioPaymentSandbox(): boolean {
  if (!canUseSessionStorage()) return false;
  try {
    return (
      window.sessionStorage.getItem(STUDIO_PAYMENT_SANDBOX_SESSION_KEY) ===
      STUDIO_PAYMENT_SANDBOX_FLAG
    );
  } catch {
    return false;
  }
}

/**
 * Re-stamp `?studioPaymentSandbox=1` when this tab already opted in.
 * Does not invent a new payment path.
 */
export function restoreStudioPaymentSandboxQuery(): boolean {
  if (!canUseSessionStorage()) return false;
  if (!sessionHasStudioPaymentSandbox()) return false;
  if (searchHasStudioPaymentSandbox(window.location.search)) return false;
  const url = new URL(window.location.href);
  url.searchParams.set(STUDIO_PAYMENT_SANDBOX_PARAM, STUDIO_PAYMENT_SANDBOX_FLAG);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  return true;
}

/**
 * Append the sandbox flag when the source search already opted in.
 * Render-safe: do not read sessionStorage here. A leftover tab opt-in
 * must be restored after paint (`restoreStudioPaymentSandboxQuery`) or
 * passed in as `sourceSearch` from a click handler. Reading storage during
 * render makes Let’s Get Started `href` differ from SSR on Samsung.
 */
export function withStudioPaymentSandboxQuery(
  pathname: string,
  sourceSearch: string | null | undefined,
): string {
  const [pathOnly, existingSearch = ""] = pathname.split("?");
  if (!searchHasStudioPaymentSandbox(sourceSearch)) {
    return pathname;
  }
  const params = new URLSearchParams(existingSearch);
  params.set(STUDIO_PAYMENT_SANDBOX_PARAM, STUDIO_PAYMENT_SANDBOX_FLAG);
  const query = params.toString();
  return query ? `${pathOnly}?${query}` : pathOnly;
}

export const CONVERSATION_ROOM_SANDBOX_HREF = withStudioPaymentSandboxQuery(
  "/studio-conversation-room",
  `?${STUDIO_PAYMENT_SANDBOX_PARAM}=${STUDIO_PAYMENT_SANDBOX_FLAG}`,
);
