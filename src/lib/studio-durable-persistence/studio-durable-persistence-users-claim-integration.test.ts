import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { consumeRateLimit, hashRateLimitSubject } from "@/lib/auth/auth-rate-limit";
import {
  consumeEmailVerificationToken,
  issueEmailVerificationToken,
} from "@/lib/auth/email-verification-tokens";
import {
  consumePasswordResetToken,
  issuePasswordResetToken,
} from "@/lib/auth/password-reset-tokens";
import {
  createClientAccount,
  findUserByEmail,
  linkClientCampaign,
  markEmailVerified,
  updatePasswordAfterReset,
  verifyLogin,
} from "@/lib/auth/users";
import {
  consumeProjectClaimReceipt,
  issueProjectClaimReceipt,
} from "@/lib/studio-project-claim/claim-receipts";

import { verifyStudioPersistenceTestTarget } from "./test-target-verify";

const ENV = { ...process.env };
const DISPOSABLE_EMAIL_PATTERN = "disposable.identity.%@example.test";
const DISPOSABLE_CAMPAIGN_PREFIX = "disposable-persistence-identity-%";

function useTestPostgresEnv(): void {
  process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
  process.env.DATABASE_URL = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
}

function disposableEmail(suffix: string): string {
  return `disposable.identity.${Date.now()}.${suffix}@example.test`;
}

afterEach(async () => {
  process.env = { ...ENV };
  vi.resetModules();
  try {
    useTestPostgresEnv();
    const { pgCleanupDisposableIdentityIntegrationTestData } = await import(
      "./postgres-identity"
    );
    const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
    await pgCleanupDisposableIdentityIntegrationTestData();
    await resetStudioPostgresPoolForTests();
  } catch {
    // ignore teardown when modules reset before pool exists
  }
});

describe.runIf(Boolean(process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL))(
  "STUDIO-DURABLE-PERSISTENCE-USERS-AND-CLAIM-1",
  () => {
    beforeAll(() => {
      const verification = verifyStudioPersistenceTestTarget(process.env);
      if (!verification.ok) {
        throw new Error(`Integration target verification failed: ${verification.reason}`);
      }
    });

    it("creates account, verifies login, and survives pool reconnect", async () => {
      useTestPostgresEnv();
      const email = disposableEmail("login");
      const password = "StudioTestPass-9x!";
      const created = await createClientAccount({
        email,
        password,
        displayName: "Disposable Identity",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
      await resetStudioPostgresPoolForTests();
      useTestPostgresEnv();

      const loggedIn = await verifyLogin(email, password);
      expect(loggedIn?.email).toBe(email.toLowerCase());
    });

    it("consumes email verification token once (concurrent safe)", async () => {
      useTestPostgresEnv();
      const email = disposableEmail("verify");
      const password = "StudioTestPass-9x!";
      const created = await createClientAccount({
        email,
        password,
        displayName: "Verify User",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const user = await findUserByEmail(email);
      expect(user?.id).toBeTruthy();

      const issued = await issueEmailVerificationToken(user!.id);
      const [first, second] = await Promise.all([
        consumeEmailVerificationToken(issued.rawToken),
        consumeEmailVerificationToken(issued.rawToken),
      ]);
      const successes = [first, second].filter((result) => result.ok);
      expect(successes).toHaveLength(1);
      expect(await markEmailVerified(user!.id)).toBeTruthy();
    });

    it("consumes password reset token and updates password", async () => {
      useTestPostgresEnv();
      const email = disposableEmail("reset");
      const password = "StudioTestPass-9x!";
      const created = await createClientAccount({ email, password, displayName: "Reset User" });
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const user = await findUserByEmail(email);
      const issued = await issuePasswordResetToken(user!.id);
      const consumed = await consumePasswordResetToken(issued.rawToken);
      expect(consumed.ok).toBe(true);
      if (!consumed.ok) return;

      const updated = await updatePasswordAfterReset(user!.id, "StudioTestPass-8y!");
      expect(updated.ok).toBe(true);
      expect(await verifyLogin(email, "StudioTestPass-8y!")).toBeTruthy();
    });

    it("enforces shared auth rate limits", async () => {
      useTestPostgresEnv();
      const subject = hashRateLimitSubject(`disposable-${Date.now()}@example.test`);
      const rule = {
        scope: "disposable-verify-resend",
        subject,
        limit: 2,
        windowMs: 60_000,
      };
      expect(await consumeRateLimit(rule)).toBe(true);
      expect(await consumeRateLimit(rule)).toBe(true);
      expect(await consumeRateLimit(rule)).toBe(false);
    });

    it("issues and consumes project claim receipt with same-user idempotency", async () => {
      useTestPostgresEnv();
      const campaignId = `disposable-persistence-identity-${Date.now()}-claim`;
      const email = disposableEmail("claim");
      const password = "StudioTestPass-9x!";
      await createClientAccount({ email, password, displayName: "Claim User" });
      const user = await findUserByEmail(email);
      expect(user?.id).toBeTruthy();

      const issued = await issueProjectClaimReceipt({
        campaignId,
        checkoutSessionId: `cs_disposable_${Date.now()}`,
        customerEmail: email,
      });
      const first = await consumeProjectClaimReceipt({
        rawToken: issued.rawToken,
        userId: user!.id,
        expectedCampaignId: campaignId,
      });
      expect(first.ok).toBe(true);
      const second = await consumeProjectClaimReceipt({
        rawToken: issued.rawToken,
        userId: user!.id,
        expectedCampaignId: campaignId,
      });
      expect(second.ok).toBe(true);
      if (second.ok) {
        expect(second.alreadyConsumedBySameUser).toBe(true);
      }
      await linkClientCampaign(user!.id, campaignId);
      const linked = await findUserByEmail(email);
      expect(linked?.clientCampaignIds).toContain(campaignId);
    });

    it("cleans up disposable identity rows", async () => {
      useTestPostgresEnv();
      const { getStudioPostgresPool } = await import("./postgres-pool");
      const pool = getStudioPostgresPool();
      const users = await pool.query(
        `SELECT COUNT(*)::int AS n FROM studio_users WHERE email_normalized LIKE $1`,
        [DISPOSABLE_EMAIL_PATTERN],
      );
      const claims = await pool.query(
        `SELECT COUNT(*)::int AS n FROM studio_project_claim_receipts WHERE campaign_id LIKE $1`,
        [DISPOSABLE_CAMPAIGN_PREFIX],
      );
      expect(users.rows[0]?.n).toBe(0);
      expect(claims.rows[0]?.n).toBe(0);
    });
  },
);
