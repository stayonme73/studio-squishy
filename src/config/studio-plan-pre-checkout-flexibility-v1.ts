/**
 * Studio Plan — Pre-Checkout Flexibility — LOCKED product principle.
 *
 * Customers can freely build and refine their Studio Plan before checkout.
 * Checkout confirms the selected scope. After checkout, additions or removals
 * are managed through the Project Change process.
 *
 * @see docs/studio-plan-pre-checkout-flexibility-v1-locked.md
 * @see docs/studio-working-draft-persistence-v1-locked.md
 */

export const STUDIO_PLAN_PRE_CHECKOUT_FLEXIBILITY_PRINCIPLE =
  "Customers can freely build and refine their Studio Plan before checkout. Checkout confirms the selected scope. After checkout, additions or removals are managed through the Project Change process." as const;

export const studioPlanPreCheckoutFlexibilityV1 = {
  principle: STUDIO_PLAN_PRE_CHECKOUT_FLEXIBILITY_PRINCIPLE,

  /**
   * Spoken during Studio Plan review — answers “Am I locked into this?”
   * before the customer hears the plan details.
   */
  voiceBeforeCheckoutFreedom:
    "This is your Studio Plan. Before checkout, you can add services, remove services, or make changes until everything looks right. Nothing is finalized until you complete checkout.",

  /**
   * Spoken when the customer confirms the plan and moves toward payment.
   */
  voiceCheckoutTransition:
    "Once you complete checkout, this Studio Plan becomes your purchased project. If you need additional work afterward, we'll handle it as a project change so everything stays organized.",

  beforeCheckoutHeading: "Before Checkout",
  beforeCheckoutItems: [
    "Add services",
    "Remove services",
    "Change your route if needed",
    "Update your answers",
    "Review pricing anytime",
  ] as const,
} as const;
