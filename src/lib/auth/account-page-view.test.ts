import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { resolveAccountPageView } from "@/lib/auth/account-page-view";

describe("My Account page", () => {
  it("asks a signed-out visitor to sign in and does not invent account tools", () => {
    const view = resolveAccountPageView(null);
    expect(view.kind).toBe("signed-out");
    if (view.kind !== "signed-out") return;
    expect(view.message).toMatch(/Sign in/);
    expect(view.signInHref).toBe("/sign-in?from=%2Fstudio-board");
    expect(view.message).not.toMatch(/coming soon/i);
    expect(JSON.stringify(view)).not.toMatch(/password|invoice|billing|verify/i);
  });

  it("shows the signed-in name and email without editing or billing", () => {
    const view = resolveAccountPageView({
      displayName: "Account Access Check",
      email: "account-access-check-20261021@local.dev",
    });
    expect(view.kind).toBe("signed-in");
    if (view.kind !== "signed-in") return;
    expect(view.name).toBe("Account Access Check");
    expect(view.email).toBe("account-access-check-20261021@local.dev");
    expect(view.signOutLabel).toBe("Sign out");
    expect(view.message).not.toMatch(/coming soon/i);
    expect(JSON.stringify(view)).not.toMatch(/password|invoice|billing|verify/i);
  });

  it("omits a blank name and still shows the email", () => {
    const view = resolveAccountPageView({ displayName: "  ", email: "person@local.dev" });
    expect(view.kind).toBe("signed-in");
    if (view.kind !== "signed-in") return;
    expect(view.name).toBeNull();
    expect(view.email).toBe("person@local.dev");
  });

  it("replaces the account placeholder and keeps the existing sign-out handoff", () => {
    const page = readFileSync(new URL("../../app/account/page.tsx", import.meta.url), "utf8");
    const button = readFileSync(
      new URL("../../components/auth/AccountSignOutButton.tsx", import.meta.url),
      "utf8",
    );
    expect(page).not.toMatch(/coming soon/i);
    expect(page).not.toContain("JourneyComingSoon");
    expect(button).toContain("customerSignOutToLobby");
  });
});
