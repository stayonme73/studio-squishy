/**
 * Certification / local-dev sandbox opt-in query.
 * Never the normal customer journey. Must survive Lobby → Conversation Room.
 */
export const STUDIO_PAYMENT_SANDBOX_PARAM = "studioPaymentSandbox" as const;
export const STUDIO_PAYMENT_SANDBOX_FLAG = "1" as const;

export function searchHasStudioPaymentSandbox(
  search: string | null | undefined,
): boolean {
  if (!search) return false;
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  return params.get(STUDIO_PAYMENT_SANDBOX_PARAM) === STUDIO_PAYMENT_SANDBOX_FLAG;
}

/** Append the sandbox flag when the source URL already opted in. */
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
