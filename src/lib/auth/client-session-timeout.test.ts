import { afterEach, describe, expect, it, vi } from "vitest";

import {
  inactivityWarningCopy,
  resolveClientInactivityTimeoutMs,
  resolveClientInactivityWarningLeadMs,
} from "@/config/studio-client-session-timeout-v1";
import {
  remainingSecondsUntilTimeout,
  shouldInactivityTimeout,
  shouldShowInactivityWarning,
} from "@/lib/auth/client-session-timeout";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("client session inactivity timing", () => {
  const timeoutMs = 30 * 60 * 1000;
  const warningLeadMs = 5 * 60 * 1000;
  const lastActivityAt = 1_000_000;

  it("stays quiet before the warning window", () => {
    const now = lastActivityAt + 20 * 60 * 1000;
    expect(
      shouldShowInactivityWarning({
        lastActivityAt,
        now,
        timeoutMs,
        warningLeadMs,
      }),
    ).toBe(false);
    expect(
      shouldInactivityTimeout({ lastActivityAt, now, timeoutMs }),
    ).toBe(false);
  });

  it("shows the warning at 25 minutes idle (5 minutes remaining)", () => {
    const now = lastActivityAt + 25 * 60 * 1000;
    expect(
      shouldShowInactivityWarning({
        lastActivityAt,
        now,
        timeoutMs,
        warningLeadMs,
      }),
    ).toBe(true);
    expect(
      shouldInactivityTimeout({ lastActivityAt, now, timeoutMs }),
    ).toBe(false);
  });

  it("times out at 30 minutes idle", () => {
    const now = lastActivityAt + 30 * 60 * 1000;
    expect(
      shouldShowInactivityWarning({
        lastActivityAt,
        now,
        timeoutMs,
        warningLeadMs,
      }),
    ).toBe(false);
    expect(
      shouldInactivityTimeout({ lastActivityAt, now, timeoutMs }),
    ).toBe(true);
  });

  it("uses inclusive boundary at exactly timeout", () => {
    expect(
      shouldInactivityTimeout({
        lastActivityAt: 0,
        now: timeoutMs,
        timeoutMs,
      }),
    ).toBe(true);
  });

  it("counts down remaining seconds until timeout", () => {
    expect(
      remainingSecondsUntilTimeout({
        lastActivityAt: 0,
        now: timeoutMs - 30_500,
        timeoutMs,
      }),
    ).toBe(31);
    expect(
      remainingSecondsUntilTimeout({
        lastActivityAt: 0,
        now: timeoutMs - 30_000,
        timeoutMs,
      }),
    ).toBe(30);
    expect(
      remainingSecondsUntilTimeout({
        lastActivityAt: 0,
        now: timeoutMs,
        timeoutMs,
      }),
    ).toBe(0);
  });
});

describe("inactivity warning copy", () => {
  it("matches the five-minute security warning", () => {
    expect(inactivityWarningCopy(5 * 60 * 1000)).toBe(
      "For your security, you'll be signed out in 5 minutes.",
    );
  });

  it("supports short certification leads in seconds", () => {
    expect(inactivityWarningCopy(30_000)).toBe(
      "For your security, you'll be signed out in 30 seconds.",
    );
  });
});

describe("env overrides for certification", () => {
  it("defaults to 30-minute timeout and 5-minute warning lead", () => {
    expect(resolveClientInactivityTimeoutMs()).toBe(30 * 60 * 1000);
    expect(resolveClientInactivityWarningLeadMs()).toBe(5 * 60 * 1000);
  });

  it("reads shortened timeout and warning lead from NEXT_PUBLIC env", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_INACTIVITY_TIMEOUT_MS", "120000");
    vi.stubEnv("NEXT_PUBLIC_AUTH_INACTIVITY_WARNING_LEAD_MS", "30000");
    expect(resolveClientInactivityTimeoutMs()).toBe(120_000);
    expect(resolveClientInactivityWarningLeadMs()).toBe(30_000);
  });
});
