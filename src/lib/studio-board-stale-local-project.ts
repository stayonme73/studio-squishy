/**
 * Another account's project left in this browser.
 * The server refusal stays. The stored project stays. The Board does not render it.
 */

export const STALE_LOCAL_PROJECT_DENIAL_CODE = "wrong_owner";

export function isAnotherCustomersLocalProjectDenial(
  code: string | null | undefined,
): boolean {
  return code === STALE_LOCAL_PROJECT_DENIAL_CODE;
}
