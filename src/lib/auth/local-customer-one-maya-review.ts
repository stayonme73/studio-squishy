/**
 * Local/test doorway onto paid Maya Review.
 * Does not remint Maya. Does not transfer THE STUDIO ownership.
 * Available only when the Customer-One fixture gate is on.
 */

import { LOCAL_CUSTOMER_ONE_FIXTURE_ID } from "@/lib/auth/local-customer-one-fixture-copy";
import { reviewProofHref } from "@/lib/review-room-navigation";
import {
  STUDIO_PAYMENT_SANDBOX_FLAG,
  STUDIO_PAYMENT_SANDBOX_PARAM,
  withStudioPaymentSandboxQuery,
} from "@/lib/studio-payment/sandbox-query";

export const LOCAL_CUSTOMER_ONE_MAYA_REVIEW_PATH =
  "/local-customer-one-maya-review" as const;

export const MAYA_PAID_CAMPAIGN_ID =
  "716a15b6-d8d6-436c-8f84-9e8b40d2f959" as const;

export const MAYA_PAID_JOB_ID =
  `${MAYA_PAID_CAMPAIGN_ID}:v2-rtu-flyer` as const;

export function mayaPaidReviewPhoneHref(): string {
  return withStudioPaymentSandboxQuery(
    reviewProofHref(MAYA_PAID_JOB_ID),
    `?${STUDIO_PAYMENT_SANDBOX_PARAM}=${STUDIO_PAYMENT_SANDBOX_FLAG}`,
  );
}

export { LOCAL_CUSTOMER_ONE_FIXTURE_ID };
