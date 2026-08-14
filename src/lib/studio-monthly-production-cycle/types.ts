import type { Sm001MonthlyProductionCycleStatus } from "@/config/studio-sm-001-monthly-production-cycle-v1";
import { studioSm001MonthlyProductionCycleV1 } from "@/config/studio-sm-001-monthly-production-cycle-v1";
import type { Sm001PlannedPostCountSelection } from "@/lib/studio-design-renderer/sm-001-types";

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
  /**
   * Durable N lock ∈ {4,5,6}. Required before machineDispatchTarget.
   * Optional only until Studio production locks N for this named cycle.
   */
  plannedPostCount?: 4 | 5 | 6;
  /** Auditable N selection — set with plannedPostCount; immutable after lock. */
  plannedPostCountSelection?: Sm001PlannedPostCountSelection;
  plannedPostCountLockedAt?: string;
  /**
   * Explicit Machine dispatch target for this named cycle.
   * Never inferred from newest / last-paid / calendar / array order.
   */
  machineDispatchTarget?: boolean;
  machineDispatchTargetSetAt?: string;
};
