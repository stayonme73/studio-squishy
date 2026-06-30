import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";

/** Owner Console is owner-only — stricter than File Room layout (staff + owner). */
export function canAccessOwnerConsole(user: StudioUser | null | undefined): boolean {
  return isOwnerUser(user);
}

export type OwnerConsoleAccessResult =
  | { kind: "ok" }
  | { kind: "forbidden" };

export function resolveOwnerConsoleAccess(
  user: StudioUser | null | undefined,
): OwnerConsoleAccessResult {
  if (!canAccessOwnerConsole(user)) {
    return { kind: "forbidden" };
  }
  return { kind: "ok" };
}
