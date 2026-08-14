/**
 * sm-001-monthly production cycle create — from confirmed paid-cycle authority only.
 * Does not remap, dispatch, or invoke the design renderer.
 */

export const studioSm001MonthlyProductionCycleV1 = {
  packageId:
    "STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PAID-AUTHORITY-TO-CYCLE-CREATE-1",
  schemaVersion: 1 as const,
  skuId: "sm-001-monthly" as const,
} as const;

export type Sm001MonthlyProductionCycleStatus = "open";
