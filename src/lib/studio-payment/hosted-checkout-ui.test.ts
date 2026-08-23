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

  it("marks forbidden card markup when present", () => {
    expect(
      markupContainsForbiddenCardFields(
        '<input name="cardNumber" autoComplete="cc-number" />',
      ),
    ).toBe(true);
  });
});
