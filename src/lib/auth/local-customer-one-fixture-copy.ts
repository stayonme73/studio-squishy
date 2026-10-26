/**
 * Customer-facing copy for the local/test Customer-One auth fixture.
 * Safe for the Sign In client component — no server or secret imports.
 */
export const LOCAL_CUSTOMER_ONE_FIXTURE_ID = "local-customer-one";

export const localCustomerOneAuthFixtureCopy = {
  eyebrow: "LOCAL DEVELOPER TEST",
  button: "Continue as Customer-One",
  note: "Local/test Customer-One access. Not a production account.",
  mayaReviewSigningIn: "Signing you into the paid Maya project. This is a local test doorway.",
} as const;
