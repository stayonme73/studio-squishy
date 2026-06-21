/** Dev overlays (sidebar status jumpers) — off by default even in local dev. */
export function isDevToolsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_TOOLS === "1"
  );
}
