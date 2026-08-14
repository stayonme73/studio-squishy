/**
 * Explicit monthly dispatch cycle target + per-cycle N lock.
 * Does not remap sm-001-monthly, wire the observer, or invoke the renderer.
 */

export const studioSm001MonthlyDispatchCycleTargetV1 = {
  packageId:
    "STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-DISPATCH-CYCLE-TARGET-IMPLEMENT-1",
  schemaVersion: 1 as const,
  skuId: "sm-001-monthly" as const,
  plannedPostCounts: [4, 5, 6] as const,
} as const;
