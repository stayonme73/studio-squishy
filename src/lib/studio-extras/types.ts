import type { CondensedPackageId } from "@/config/studio-customer-journey-condense-v1";
import type { StudioExtraId } from "@/config/studio-extras-v1";

export type StudioExtraState =
  | "waiting_on_client"
  | "ready_for_production"
  | "in_production"
  | "waiting_on_system"
  | "ready_for_review"
  | "revision_requested"
  | "approved"
  | "delivered"
  | "exhausted";

export type StudioExtraInputKey =
  | "offer"
  | "cta"
  | "contact"
  | "review_link"
  | "text_consent"
  | "menu_items"
  | "menu_kind"
  | "menu_notes"
  | "logo";

export type StudioExtraUnitKind = "design" | "copy";

export type StudioExtraAttemptRoute = "primary" | "recovery";

export type StudioExtraAttemptOutcome = "passed" | "failed" | "writer_unavailable";

export type StudioExtraAttempt = {
  attempt: number;
  route: StudioExtraAttemptRoute;
  at: string;
  outcome: StudioExtraAttemptOutcome;
  reasons: readonly string[];
};

export type StudioExtraArtifact = {
  /** Repo-relative path under `data/campaign-design-artifacts/`. */
  path: string;
  label: string;
  mimeType: string;
};

export type StudioExtraQualityOutcome = "pending" | "passed" | "below_standard";

export type StudioExtraUnit = {
  unitId: string;
  label: string;
  kind: StudioExtraUnitKind;
  productionLine: string;
  budget: number;
  attempts: readonly StudioExtraAttempt[];
  recovery: {
    available: boolean;
    attempted: boolean;
    outcome?: "passed" | "failed";
  };
  quality: {
    outcome: StudioExtraQualityOutcome;
    at?: string;
    summary?: string;
  };
  artifacts: readonly StudioExtraArtifact[];
};

export type StudioExtraExhaustionProof = {
  at: string;
  unitId: string;
  customerSuppliedRequiredInputs: true;
  attemptsUsed: number;
  attemptBudget: number;
  recoveryAvailable: boolean;
  recoveryAttempted: boolean;
  qualitySummary: string;
};

export type StudioExtraHistoryEvent = {
  at: string;
  event: string;
  detail: string;
  actor: "customer" | "system" | "studio";
};

export type StudioExtraRecord = {
  id: StudioExtraId;
  name: string;
  state: StudioExtraState;
  requiredInputs: readonly StudioExtraInputKey[];
  missingInputs: readonly StudioExtraInputKey[];
  units: readonly StudioExtraUnit[];
  exhaustion: StudioExtraExhaustionProof | null;
  /** Package revision round this Extra was last revised in (shared counter). */
  lastRevisionRound: number | null;
  revisionNote: string | null;
  approvedAt: string | null;
  deliveredAt: string | null;
  history: readonly StudioExtraHistoryEvent[];
};

export type StudioExtrasCourtesyStatus =
  | "not_eligible"
  | "COURTESY_ADJUSTMENT_REQUIRED"
  | "issued";

/** Stripe accepted a refund before it finished. Completed is a later event. */
export type CourtesyRefundStage =
  | "not_started"
  | "accepted"
  | "completed"
  | "failed"
  | "uncertain";

export type StudioExtrasCourtesy = {
  status: StudioExtrasCourtesyStatus;
  exhaustedExtraIds: readonly StudioExtraId[];
  percent: number;
  amountPaidCents: number;
  totalAdjustmentCents: number;
  alreadyIssuedCents: number;
  dueCents: number;
  /** Proof checklist from `studioExtrasV1.courtesyAdjustment.requiredProof`. */
  proof: Readonly<Record<string, boolean>>;
  paymentExecution: CourtesyRefundStage;
  /** Amount sent to Stripe for this adjustment. Null until a refund is attempted. */
  refundAmountCents: number | null;
  stripeRefundId: string | null;
  idempotencyKey: string | null;
  refundAttempt: number;
  providerStatus: string | null;
  /** True when Stripe definitively refused and a later attempt may use a new key. */
  failureDefinitive: boolean | null;
  failureReason: string | null;
  /** Success is a notice. Failure or an unconfirmed result is an exception. */
  ownerAttention: "none" | "notice" | "exception";
  ownerNotice: string | null;
  computedAt: string;
  /**
   * Last Courtesy stage successfully emailed. A later Stripe stage sends again.
   * Absent until Resend accepts the message.
   */
  customerEmailStage?: CourtesyRefundStage | null;
  customerEmailRefundId?: string | null;
  customerEmailAttempts?: number;
  customerEmailLastAttemptAt?: string | null;
};

/**
 * A change request on Extras only (no package change). Spends one of the
 * package's shared revision rounds once the revised Extra reaches Review,
 * the same rule as package revisions. Changes requested together with a
 * package revision ride that package round instead and are not listed here.
 */
export type StudioExtrasRevisionRound = {
  roundId: string;
  requestedAt: string;
  extraIds: readonly StudioExtraId[];
  /** Set when every revised Extra is back in Review. Counts against the shared rounds. */
  reachedReviewAt: string | null;
  /** Set when the revised work could not reach Review (exhausted). Never counted. */
  voidedAt: string | null;
};

export type FulfillmentDollarStatus = "UNKNOWN" | "DERIVED" | "MEASURED";

export type FulfillmentUsageKind = "provider_usage" | "quality_check" | "refund";

export type FulfillmentUsageLine = {
  lineId: string;
  campaignId: string;
  packageId: CampaignStudioExtras["packageId"];
  extraId: StudioExtraId | null;
  selectedExtras: readonly StudioExtraId[];
  unitId: string | null;
  productionLine: string;
  kind: FulfillmentUsageKind;
  provider: string;
  model: string | null;
  purpose: string;
  attempt: number;
  httpStatus: number | null;
  billable: boolean;
  usage: {
    textInputTokens: number;
    cachedTextInputTokens: number;
    imageInputTokens: number;
    textOutputTokens: number;
    imageOutputTokens: number;
    renderCredits: number | null;
  };
  dollarStatus: FulfillmentDollarStatus;
  costUsd: number | null;
  rateSource:
    | "unverified_list_rate_not_used"
    | "verified_rate_card"
    | "no_invoice"
    | "courtesy_policy_of_amount_paid";
  /** Shared package revision round. Null when this work is still the original production. */
  packageRevisionRound: number | null;
  sharesPackageRevisionRounds: true;
  separateExtraRevisionAllowance: false;
  deliveryState: StudioExtraState | "package";
  at: string;
};

export type CampaignStudioExtras = {
  schemaVersion: 1;
  packageId: CondensedPackageId;
  selected: readonly StudioExtraId[];
  eligibleAtSelection: readonly StudioExtraId[];
  selectedAt: string;
  records: readonly StudioExtraRecord[];
  revisionRounds?: readonly StudioExtrasRevisionRound[];
  courtesy: StudioExtrasCourtesy | null;
  /** Provider usage and quality checks for this order. Dollars stay null until a rate is verified. */
  fulfillmentUsage?: readonly FulfillmentUsageLine[];
  updatedAt: string;
};
