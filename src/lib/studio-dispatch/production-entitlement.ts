/**
 * Whether a request is entitled to spend money producing a new artifact.
 *
 * A dispatch invocation has exactly three honest outcomes, and the Machine has to
 * resolve exactly one of them *before* it calls a provider:
 *
 *   ALREADY_RENDERED          — this request is already satisfied; return that
 *                               artifact and spend nothing
 *   AUTHORIZED_NEW_PRODUCTION — production is warranted, for a reason that can be
 *                               named and evidenced
 *   BLOCKED                   — refuse; nothing entitles spending here
 *
 * Two failures produced this module, in order.
 *
 * The first was treating a missed cache hit as permission to produce. A miss only
 * says the identity did not match; it is not evidence that new work is warranted.
 *
 * The second was subtler and is what this revision fixes: the reasons that *did*
 * authorize production were read out of correction-loop state — an active brief, an
 * in-progress flag, a count of prior attempts. That state is mutable, has more than
 * one writer, and goes stale. A stale loop could therefore manufacture a reason to
 * spend on a request that had already been delivered. A workflow flag saying "go"
 * must never be able to buy anything.
 *
 * So authority here comes from two places only:
 *
 *   - **Immutable receipts**, which record what was actually produced for which
 *     request. Receipts cannot go stale.
 *   - **The request itself** — the customer's facts, materials, SKU, renderer
 *     version, and production method, via the request key. When the customer's
 *     truth changes, the request changes, and that is a real entitlement.
 *
 * Anything else that wants to spend beyond a satisfied request needs an explicit,
 * attributed authorization passed in by the caller. Correction-loop state may still
 * decide *how* an authorized attempt is made — which brief, which constraints — but
 * it cannot decide *whether* money may be spent.
 *
 * Pure and synchronous on purpose: it decides, it never renders, and it can be
 * proven by unit test without staging an artifact or touching a provider.
 */

/** Why a new artifact — and the provider spend it costs — is warranted. */
export type NewProductionReason =
  /** No attempt has yet been paid for on this request's behalf. */
  | "first_production"
  /**
   * The request is still unsatisfied after at least one completed attempt, and the
   * correction budget has room. This is the internal QA-correction lane. It does not
   * consume a customer revision.
   */
  | "studio_quality_correction"
  /**
   * The request is already satisfied, and a caller presented an explicit attributed
   * authorization to produce anyway — a certification measurement run, or an owner
   * decision. The only way to spend against delivered work.
   */
  | "explicit_authorization";

export type ProductionEntitlement =
  | {
      decision: "ALREADY_RENDERED";
      detail: string;
    }
  | {
      decision: "AUTHORIZED_NEW_PRODUCTION";
      reason: NewProductionReason;
      detail: string;
    }
  | {
      decision: "BLOCKED";
      failureCode: string;
      detail: string;
    };

/**
 * An explicit, attributed right to produce against an already-satisfied request.
 *
 * Deliberately not a boolean: whatever spends money against delivered work has to
 * say who authorized it and why, so it can never be read as organic behaviour.
 *
 * `authorizationId` makes it a *single* right rather than a standing one. Without an
 * identity it was replayable: the same payload sent twice authorized production
 * twice, and sent N times authorized N paid remints of delivered work — the exact
 * failure this module exists to prevent, arriving through the one door that is
 * allowed to outrank satisfaction. The id is what lets immutable evidence say
 * whether this authorization has already been spent.
 */
export interface ExplicitProductionAuthorization {
  /** Stable identity of this one grant. Reusing it does not buy a second artifact. */
  authorizationId: string;
  authorizedBy: string;
  reason: string;
}

export interface ProductionEntitlementFacts {
  /**
   * A delivered, QA-passing, still-intact artifact exists for this exact request.
   * Read from receipts via `summarizeRequestSatisfaction` — never from loop state.
   */
  requestAlreadySatisfied: boolean;
  /**
   * Attempts that reached QA for this request, whatever the verdict. Counted from
   * receipts, because those are the attempts that actually cost money.
   */
  completedAttemptsForRequest: number;
  /** How many paid attempts this request is allowed before owner escalation. */
  correctionAttemptBudget: number;
  /** An explicit attributed authorization, when the caller presented one. */
  explicitAuthorization: ExplicitProductionAuthorization | null;
  /**
   * Whether this exact authorization has already been spent on this request.
   *
   * Read from the spend ledger, which is immutable evidence — so a replayed
   * authorization cannot buy a second artifact no matter how many times it is
   * presented. One grant, one production.
   */
  explicitAuthorizationAlreadyUsed: boolean;
}

/** The refusal code callers surface when nothing entitles a new mint. */
export const REMINT_NOT_ENTITLED = "REMINT_NOT_ENTITLED";

/** The refusal code for a request that has spent its correction budget. */
export const CORRECTION_BUDGET_EXHAUSTED = "INTERNAL_CORRECTION_EXHAUSTED";

/**
 * Resolve the decision.
 *
 * Satisfaction is checked first and outranks every reason to produce, so an
 * authorized correction returns the artifact it already produced rather than paying
 * for it twice. That ordering is what makes a repeated correction request free.
 */
export function resolveProductionEntitlement(
  facts: ProductionEntitlementFacts,
): ProductionEntitlement {
  if (facts.requestAlreadySatisfied) {
    if (facts.explicitAuthorization && !facts.explicitAuthorizationAlreadyUsed) {
      return {
        decision: "AUTHORIZED_NEW_PRODUCTION",
        reason: "explicit_authorization",
        detail:
          `Request is already satisfied, and ${facts.explicitAuthorization.authorizedBy} ` +
          `explicitly authorized production anyway: ${facts.explicitAuthorization.reason} ` +
          `(authorization ${facts.explicitAuthorization.authorizationId}).`,
      };
    }
    if (facts.explicitAuthorization) {
      // The grant was real, and it has already been spent. Replaying it must not buy
      // a second artifact, so this falls back to the delivered one.
      return {
        decision: "ALREADY_RENDERED",
        detail:
          `Authorization ${facts.explicitAuthorization.authorizationId} has already ` +
          "produced an artifact for this request. Returning it rather than spending " +
          "again; a fresh production needs a new authorization.",
      };
    }
    return {
      decision: "ALREADY_RENDERED",
      detail:
        "A delivered, QA-passing artifact already satisfies this request. Returning it " +
        "without spending provider budget.",
    };
  }

  if (facts.completedAttemptsForRequest >= facts.correctionAttemptBudget) {
    // The way out of an exhausted budget, and the only one.
    //
    // Attempts are counted conservatively: an attempt that reserved and then died
    // before its cost could be settled counts as paid, because unknown spend has to be
    // treated as spend. That is the right way to be wrong about money, but it means a
    // job can be blocked by attempts that in fact cost nothing, and something has to be
    // able to release it. An unspent explicit grant is that something — attributed,
    // single-use, and deliberate, which is exactly what owner judgment should look like
    // in the record. Nothing automatic may clear this.
    if (facts.explicitAuthorization && !facts.explicitAuthorizationAlreadyUsed) {
      return {
        decision: "AUTHORIZED_NEW_PRODUCTION",
        reason: "explicit_authorization",
        detail:
          `This request has already paid for ${facts.completedAttemptsForRequest} ` +
          `attempt(s) against a budget of ${facts.correctionAttemptBudget}, and ` +
          `${facts.explicitAuthorization.authorizedBy} authorized another anyway: ` +
          `${facts.explicitAuthorization.reason} ` +
          `(authorization ${facts.explicitAuthorization.authorizationId}).`,
      };
    }
    return {
      decision: "BLOCKED",
      failureCode: CORRECTION_BUDGET_EXHAUSTED,
      detail:
        `This request has already paid for ${facts.completedAttemptsForRequest} ` +
        `attempt(s) against a budget of ${facts.correctionAttemptBudget} and is still ` +
        "unsatisfied. Owner judgment is required; refusing further spend. An explicit, " +
        "attributed authorization can permit one more attempt.",
    };
  }

  if (facts.completedAttemptsForRequest === 0) {
    return {
      decision: "AUTHORIZED_NEW_PRODUCTION",
      reason: "first_production",
      detail: "No attempt has been paid for on this request yet.",
    };
  }

  return {
    decision: "AUTHORIZED_NEW_PRODUCTION",
    reason: "studio_quality_correction",
    detail:
      `Request is still unsatisfied after ${facts.completedAttemptsForRequest} ` +
      `completed attempt(s), with budget for ${facts.correctionAttemptBudget}. ` +
      "Studio correction; does not consume a customer revision.",
  };
}
