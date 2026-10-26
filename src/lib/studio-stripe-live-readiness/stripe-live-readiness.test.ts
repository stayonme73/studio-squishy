import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { INTERNAL_SELL_NOW_SKUS } from "@/config/studio-internal-sell-now-register-v1";
import { studioPaymentV1 } from "@/config/studio-payment-v1";
import { studioStripeLiveReadinessV1 } from "@/config/studio-stripe-live-readiness-v1";
import { studioVoiceLaunchBlockerHardeningV1 as harden } from "@/config/studio-voice-launch-blocker-hardening-v1";
import { computePlanPricingTotals } from "@/lib/plan-pricing";
import {
  assertStripeSafeForTests,
  inferStripeMode,
  stripeCredentialPresence,
} from "@/lib/studio-payment/env";

describe("STUDIO-OPERATING-STRIPE-LIVE-READINESS-AND-CERTIFICATION-1", () => {
  it("refuses to stamp live certification without evidence", () => {
    expect(studioStripeLiveReadinessV1.liveCertified).toBe(false);
    expect(studioStripeLiveReadinessV1.verdict).toBe("READY_BUT_BLOCKED");
    expect(studioStripeLiveReadinessV1.doNotFakeLive).toBe(true);
    expect(studioStripeLiveReadinessV1.stripeRefundsApiImplemented).toBe("test_mode_only");
    expect(studioStripeLiveReadinessV1.stripeLiveRefundsEnabled).toBe(false);
    expect(studioStripeLiveReadinessV1.browserReturnIsNotPaymentProof).toBe(true);
  });

  it("does not find a live merchant key in this workspace process", () => {
    const presence = stripeCredentialPresence();
    expect(presence.mode).not.toBe("live");
    expect(inferStripeMode()).not.toBe("live");
    expect(presence.secretKeyStatus).not.toBe("ok");
  });

  it("keeps webhook as the paid-activation authority and forbids live keys in tests", () => {
    expect(studioPaymentV1.routes.webhook).toBe("/api/payments/webhook");
    expect(studioPaymentV1.routes.reconcile).toBe("/api/payments/reconcile");
    expect(studioPaymentV1.customerCopy.paymentPending).toMatch(
      /this page alone is not proof of payment/i,
    );
    expect(() =>
      assertStripeSafeForTests({
        NODE_ENV: "test",
        STRIPE_SECRET_KEY: "sk_live_should_never_run_in_tests",
      }),
    ).toThrow(/live mode is forbidden/);
  });

  it("keeps the public 11 prices server-derived and Voice payment-failure copy honest", () => {
    expect(INTERNAL_SELL_NOW_SKUS).toHaveLength(11);
    const flyer = computePlanPricingTotals(["v2-rtu-flyer"]);
    expect(flyer.amountDueTodayCents).toBe(6900);
    expect(harden.checkoutPaymentFailedVoice).toMatch(/no order was activated/i);
    expect(harden.checkoutPaymentCancelledVoice).toMatch(/checkout was cancelled/i);
    expect(harden.refundAck).toMatch(/owner will make the judgment/i);
    expect(harden.refundAck).not.toMatch(/refund approved|you will receive/i);
  });

  it("executes Stripe refunds only through the canonical guarded test-mode path and does not leak secrets in the stamp", () => {
    const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
    const callers = [
      "src/lib/job-control/owner-decision-job-actions.ts",
      "src/lib/job-control/production-workspace-actions.ts",
      "src/lib/studio-payment/refund-execution-run.ts",
      "src/lib/studio-payment/webhook.ts",
      "src/app/api/campaigns/[campaignId]/jobs/[jobId]/route.ts",
    ];
    for (const path of callers) expect(read(path)).not.toMatch(/refunds\.create/);

    const execution = read("src/lib/studio-payment/refund-execution.ts");
    expect(execution.match(/refunds\.create\(/g)).toHaveLength(1);
    expect(execution).toMatch(/inferStripeMode\(env\) !== "test"/);
    expect(execution).toMatch(/truth\.sandbox\) return blocked\("sandbox_payment"\)/);
    expect(execution).toMatch(/idempotencyKey: plan\.idempotencyKey/);
    expect(execution).toMatch(/maximumApprovedFullRefundCents\(input\.campaign\)/);

    const actions = read("src/lib/job-control/owner-decision-job-actions.ts");
    expect(actions).toMatch(/job\.productionStartedAt \|\| job\.nonRefundable/);
    expect(actions).toMatch(/evaluateRefundExecutionPlan/);
    expect(read("src/lib/job-control/production-workspace-actions.ts")).toMatch(
      /case "issue_refund":\s*return applyOwnerApproveRefund\(/,
    );

    const stamp = readFileSync(
      resolve(
        process.cwd(),
        "docs/launch/studio-operating-stripe-live-readiness-and-certification-1/STUDIO-OPERATING-STRIPE-LIVE-READINESS-AND-CERTIFICATION.md",
      ),
      "utf8",
    );
    expect(stamp).not.toMatch(/sk_live_[A-Za-z0-9]{8,}|sk_test_[A-Za-z0-9]{8,}|whsec_[A-Za-z0-9]{8,}/);
    expect(stamp).toMatch(/READY BUT BLOCKED/);
    expect(stamp).toMatch(/not LIVE CERTIFIED/i);
  });
});
