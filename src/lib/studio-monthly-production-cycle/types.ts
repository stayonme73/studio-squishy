import type { Sm001MonthlyProductionCycleStatus } from "@/config/studio-sm-001-monthly-production-cycle-v1";
import { studioSm001MonthlyProductionCycleV1 } from "@/config/studio-sm-001-monthly-production-cycle-v1";

/**
 * Explicit service-production-period truth for one paid cycle purchase.
 * Must be locked before productionCycleId mint — never wall-clock / Stripe / "Current cycle".
 */
export type Sm001MonthlyCyclePeriodTruth = {
  schemaVersion: typeof studioSm001MonthlyProductionCycleV1.schemaVersion;
  paidCyclePurchaseId: string;
  campaignId: string;
  cycleStartDate: string;
  cycleEndDate: string;
  monthlyContentFocus: string;
  lockedAt: string;
  /** Explicit lock only — not calendar inference. */
  source: "explicit_service_production_period";
};

/**
 * Authoritative monthly production cycle — created by activation seam from paid authority.
 * Renderer consumes; does not mint.
 */
export type Sm001MonthlyProductionCycleRecord = {
  schemaVersion: typeof studioSm001MonthlyProductionCycleV1.schemaVersion;
  productionCycleId: string;
  paidCyclePurchaseId: string;
  checkoutSessionId: string;
  campaignId: string;
  skuId: typeof studioSm001MonthlyProductionCycleV1.skuId;
  cycleStartDate: string;
  cycleEndDate: string;
  monthlyContentFocus: string;
  status: Sm001MonthlyProductionCycleStatus;
  createdAt: string;
  /** Optional until pre-production Studio decision locks N ∈ {4,5,6}. */
  plannedPostCount?: 4 | 5 | 6;
};
