import type { StudioRole, StudioUser } from "@/lib/campaign-store/types";

export function hasRole(user: StudioUser, role: StudioRole): boolean {
  return user.roles.includes(role);
}

export function isStaffOrOwner(user: StudioUser | null | undefined): boolean {
  if (!user) return false;
  return hasRole(user, "owner") || hasRole(user, "staff");
}

export function isClientOnly(user: StudioUser | null | undefined): boolean {
  if (!user) return false;
  return hasRole(user, "client") && !isStaffOrOwner(user);
}
