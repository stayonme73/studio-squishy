import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  HOSTED_CHECKOUT_FORBIDDEN_FIELD_NAMES,
  isDeveloperCheckoutSandboxVisible,
  markupContainsForbiddenCardFields,
} from "./hosted-checkout-ui";

describe("hosted Checkout single-entry UI contract", () => {
  it("SecureCheckoutGrid source has no local card/payment-method fields", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/payment/SecureCheckoutGrid.tsx"),
      "utf8",
    );
    expect(markupContainsForbiddenCardFields(source)).toBe(false);
    for (const name of HOSTED_CHECKOUT_FORBIDDEN_FIELD_NAMES) {
      expect(source).not.toContain(`name="${name}"`);
    }
    expect(source).not.toContain('autoComplete="cc-number"');
    expect(source).not.toContain('autoComplete="cc-exp"');
    expect(source).not.toContain('autoComplete="cc-csc"');
    expect(source).toContain('data-collects-card="false"');
    expect(source).toContain('data-hosted-checkout="stripe"');
    expect(source).toContain("useEffect");
    expect(source).toContain("lobby-entry-film__cta co-submit");
    expect(source).toContain('href="#checkout-continue"');
    expect(source).not.toContain("utility-btn--primary");
    expect(source).toContain("if (!termsAccepted)");
    expect(source).toContain('data-checkout-pay="continue"');
    expect(source).toContain("setShowSandboxFixture");
    expect(source).not.toContain(
      'typeof window !== "undefined" ? window.location.search',
    );
  });

  it("hides sandbox fixture from normal customer checkout", () => {
    expect(
      isDeveloperCheckoutSandboxVisible({
        env: { NODE_ENV: "development" } as NodeJS.ProcessEnv,
        search: "",
      }),
    ).toBe(false);
    expect(
      isDeveloperCheckoutSandboxVisible({
        env: { NODE_ENV: "production" } as NodeJS.ProcessEnv,
        search: "?studioPaymentSandbox=1",
      }),
    ).toBe(false);
  });

  it("shows sandbox fixture only with explicit developer opt-in", () => {
    expect(
      isDeveloperCheckoutSandboxVisible({
        env: {
          NODE_ENV: "development",
          NEXT_PUBLIC_DEV_TOOLS: "1",
        } as NodeJS.ProcessEnv,
        search: "",
      }),
    ).toBe(true);
    expect(
      isDeveloperCheckoutSandboxVisible({
        env: { NODE_ENV: "development" } as NodeJS.ProcessEnv,
        search: "?studioPaymentSandbox=1",
      }),
    ).toBe(true);
  });

  it("uses inlinable process.env members when env is omitted", () => {
    expect(
      isDeveloperCheckoutSandboxVisible({
        search: "?studioPaymentSandbox=1",
      }),
    ).toBe(process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test");
    expect(
      isDeveloperCheckoutSandboxVisible({
        env: {} as NodeJS.ProcessEnv,
        search: "?studioPaymentSandbox=1",
      }),
    ).toBe(false);
  });

  it("Continue to Secure Checkout does not silently fall back to sandbox", () => {
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    const continueFn = runtime.slice(
      runtime.indexOf("async function handleCheckoutPaymentComplete()"),
      runtime.indexOf("async function handleSandboxCheckoutConfirm()"),
    );
    const sandboxFn = runtime.slice(
      runtime.indexOf("async function handleSandboxCheckoutConfirm()"),
      runtime.indexOf("/** Return from Stripe Checkout"),
    );
    expect(continueFn).toContain("startHostedCheckout(");
    expect(continueFn).not.toContain("preferSandbox");
    expect(continueFn).toContain('started.mode !== "stripe"');
    expect(sandboxFn).toContain("preferSandbox: true");
    expect(sandboxFn).toContain("confirmSandboxCheckoutClient");
  });

  it("payment=return reconciles and never writes paid locally", () => {
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    const returnEffect = runtime.slice(
      runtime.indexOf("/** Return from Stripe Checkout"),
      runtime.indexOf("function handleIntakeSubmitSuccess()"),
    );
    expect(returnEffect).toContain('payment !== "return"');
    expect(returnEffect).toContain("reconcileCheckoutClient(sessionId)");
    expect(returnEffect).toContain("result.paid && result.campaign");
    expect(returnEffect).not.toContain("markPaymentReceived");
    expect(returnEffect).not.toContain("preferSandbox");
  });

  it("marks forbidden card markup when present", () => {
    expect(
      markupContainsForbiddenCardFields(
        '<input name="cardNumber" autoComplete="cc-number" />',
      ),
    ).toBe(true);
  });
});
