import { spawnSync } from "child_process";
import path from "path";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  createClientAccount,
  findUserByEmail,
  linkClientCampaign,
  markEmailVerified,
} from "@/lib/auth/users";
import type { StudioUser } from "@/lib/campaign-store/types";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { getOrInitializeProduction } from "@/lib/campaign-production/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { seedCustomerFieldTokensFromProjectDetails } from "@/lib/customer-field-tokens";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import { readProjectActivityEnvelope } from "@/lib/project-activity/store";
import { readProjectCommunicationEnvelope } from "@/lib/project-communication/store";
import { confirmPaymentFromProcessor } from "@/lib/studio-payment/confirm";
import { writeCheckoutSessionBinding } from "@/lib/studio-payment/events-store";
import { buildPreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";
import { evaluatePreAcceptance } from "@/lib/studio-pre-acceptance/evaluate";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";
import { claimCampaignForVerifiedClient } from "@/lib/studio-project-claim/claim";

import { verifyStudioPersistenceTestTarget } from "./test-target-verify";

const ENV = { ...process.env };
const REPO_ROOT = path.resolve(__dirname, "../../..");
const FLYER_ONLY = ["v2-rtu-flyer"] as const;
const SESSION_SECRET = "test-persistence-e2e-session-secret-value";

function useTestPostgresEnv(): void {
  process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
  process.env.DATABASE_URL = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
  process.env.SESSION_SECRET = SESSION_SECRET;
}

function disposableCampaignId(suffix: string): string {
  return `disposable-persistence-e2e-${Date.now()}-${suffix}`;
}

function disposableEmail(suffix: string): string {
  return `disposable.persistence.e2e.${Date.now()}.${suffix}@example.test`;
}

function clearFacts(
  overrides: Partial<PreAcceptanceProjectFacts> = {},
): PreAcceptanceProjectFacts {
  return {
    draftRevision: 1,
    routeId: "i75",
    selectedServiceIds: [...FLYER_ONLY],
    projectNeed: "Need a flyer for our spring open house",
    businessName: "E2E Cedar Lane",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a flyer for our spring open house",
    ...overrides,
  };
}

function unpaidCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals([...FLYER_ONLY]);
  const lineItems = buildServiceScopeSnapshot([...FLYER_ONLY]);
  return {
    campaignId,
    campaignName: "E2E Cedar Lane",
    campaignStatus: "DRAFT_RECEIVED",
    campaignDescription: "Persistence E2E probe",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [...FLYER_ONLY],
      includedServiceIds: [...FLYER_ONLY],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems,
      approvedAt: now,
    },
  };
}

async function seedClearedMaterials(campaignId: string): Promise<void> {
  const now = new Date().toISOString();
  const items: CampaignMaterialItem[] = [
    {
      id: "logo-e2e",
      category: "logo-brand",
      requirementLevel: "required",
      reviewStatus: "approved_for_use",
      contentKind: "file-metadata",
      label: "Logo",
      reason: "Brand mark",
      relatedServiceIds: [...FLYER_ONLY],
      uploadStatus: "stored",
      useAuthorization: {
        basis: "customer_owns",
        attestedAt: now,
      },
    },
  ];
  await writeMaterialsEnvelope({
    campaignId,
    items,
    updatedAt: now,
    syncedAt: now,
    version: 1,
  });
}

async function requestWithSession(user: StudioUser, url: string, init?: RequestInit): Promise<Request> {
  const token = await createSessionToken(user);
  const headers = new Headers(init?.headers);
  headers.set("cookie", `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Request(url, { ...init, headers });
}

async function runSeparateProcessProbe(campaignId: string): Promise<void> {
  const result = spawnSync(
    "npx",
    ["tsx", "scripts/studio-persistence-e2e-state-probe.ts", campaignId],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        STUDIO_PERSISTENCE_BACKEND: "postgres",
        DATABASE_URL: process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL,
      },
      encoding: "utf8",
      shell: true,
    },
  );
  expect(result.status).toBe(0);
  const payload = JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "{}") as {
    ok?: boolean;
  };
  expect(payload.ok).toBe(true);
}

afterEach(async () => {
  process.env = { ...ENV };
  vi.resetModules();
  try {
    useTestPostgresEnv();
    const { pgCleanupDisposableE2eIntegrationTestData } = await import("./postgres-e2e-cleanup");
    const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
    await pgCleanupDisposableE2eIntegrationTestData();
    await resetStudioPostgresPoolForTests();
  } catch {
    // ignore teardown errors after module reset
  }
});

describe.runIf(Boolean(process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL))(
  "STUDIO-DURABLE-PERSISTENCE-END-TO-END-1",
  () => {
    beforeAll(() => {
      const verification = verifyStudioPersistenceTestTarget(process.env);
      if (!verification.ok) {
        throw new Error(`Integration target verification failed: ${verification.reason}`);
      }
    });

    it("runs customer journey orchestrators and routes on Postgres with reconnect and child process", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("journey");
      const email = disposableEmail("client");
      const password = "StudioTestPass-9x!";

      await upsertCampaignRecord(unpaidCampaign(campaignId));
      await seedClearedMaterials(campaignId);

      const totals = computePlanPricingTotals([...FLYER_ONLY]);
      const facts = clearFacts();
      const decision = evaluatePreAcceptance(facts);
      expect(decision.outcome).toBe("CLEAR_TO_ACCEPT");
      const authorization = buildPreAcceptancePaymentAuthorization(decision);
      expect(authorization).not.toBeNull();
      if (!authorization) return;

      const sessionId = `cs_disposable_e2e_${Date.now()}`;
      await writeCheckoutSessionBinding({
        checkoutSessionId: sessionId,
        campaignId,
        expectedAmountCents: totals.amountDueTodayCents,
        currency: "usd",
        selectedServiceIds: [...FLYER_ONLY],
        decisionId: authorization.decisionId,
        factFingerprint: authorization.factFingerprint,
        draftRevision: authorization.evaluatedDraftRevision,
        createdAt: new Date().toISOString(),
        sandbox: true,
      });

      const confirmInput = {
        campaignId,
        checkoutSessionId: sessionId,
        paymentIntentId: `pi_e2e_${campaignId}`,
        expectedAmountCents: totals.amountDueTodayCents,
        confirmedAmountCents: totals.amountDueTodayCents,
        currency: "usd" as const,
        selectedServiceIds: [...FLYER_ONLY],
        decisionId: authorization.decisionId,
        factFingerprint: authorization.factFingerprint,
        draftRevision: authorization.evaluatedDraftRevision,
        authorization,
        stripeEventId: `evt_e2e_${campaignId}`,
        sandbox: true as const,
      };

      const paid = await confirmPaymentFromProcessor(confirmInput);
      expect(paid.ok).toBe(true);
      if (!paid.ok) return;
      expect(paid.campaign.postPayActivation?.status).toBe("activated");

      const duplicate = await confirmPaymentFromProcessor(confirmInput);
      expect(duplicate.ok).toBe(true);
      if (!duplicate.ok) return;
      expect(duplicate.alreadyPaid).toBe(true);

      const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
      await resetStudioPostgresPoolForTests();
      useTestPostgresEnv();

      const tasksAfterPay = await readTasksEnvelope(campaignId);
      expect(tasksAfterPay?.jobRecords?.length).toBeGreaterThan(0);

      const created = await createClientAccount({
        email,
        password,
        displayName: "E2E Client",
      });
      expect(created.ok).toBe(true);
      const userRecord = await findUserByEmail(email);
      expect(userRecord?.id).toBeTruthy();
      await markEmailVerified(userRecord!.id);

      const clientUser: StudioUser = {
        id: userRecord!.id,
        email: userRecord!.email,
        displayName: userRecord!.displayName,
        roles: ["client"],
        emailVerifiedAt: new Date().toISOString(),
      };

      const claim = await claimCampaignForVerifiedClient({
        user: clientUser,
        campaignId,
        rawClaimToken: paid.claimRawToken,
        allowLocalPossession: false,
      });
      expect(claim.ok).toBe(true);
      await linkClientCampaign(clientUser.id, campaignId);

      const linkedUser: StudioUser = {
        ...clientUser,
        clientCampaignIds: [campaignId],
        currentCampaignId: campaignId,
      };

      const now = new Date().toISOString();
      const withIntake = seedCustomerFieldTokensFromProjectDetails({
        ...(await readCampaignEnvelope(campaignId))!.record,
        projectDetailsSubmittedAt: now,
        projectDetails: {
          form: { ...EMPTY_PROJECT_DETAILS_FORM, primaryApproverEmail: "e2e@example.com" },
          files: [],
          submittedAt: now,
        },
      });
      await upsertCampaignRecord(withIntake, linkedUser.id);

      await getOrInitializeProduction(campaignId, withIntake);

      const projectStatusRoute = await import(
        "@/app/api/campaigns/[campaignId]/project-status/route"
      );
      const statusRes = await projectStatusRoute.GET(
        await requestWithSession(
          linkedUser,
          `http://localhost/api/campaigns/${campaignId}/project-status`,
        ),
        { params: Promise.resolve({ campaignId }) },
      );
      expect(statusRes.status).toBe(200);
      const statusJson = (await statusRes.json()) as { jobs: unknown[] };
      expect(statusJson.jobs.length).toBeGreaterThan(0);

      const commRoute = await import(
        "@/app/api/campaigns/[campaignId]/project-communication/customer/route"
      );
      const commPost = await commRoute.POST(
        await requestWithSession(
          linkedUser,
          `http://localhost/api/campaigns/${campaignId}/project-communication/customer`,
          {
            method: "POST",
            body: JSON.stringify({
              body: "When will my flyer be ready?",
              idempotencyKey: "e2e-comm-1",
            }),
          },
        ),
        { params: Promise.resolve({ campaignId }) },
      );
      expect(commPost.status).toBe(200);

      const activityRoute = await import("@/app/api/campaigns/[campaignId]/project-activity/route");
      const activityPost = await activityRoute.POST(
        await requestWithSession(
          linkedUser,
          `http://localhost/api/campaigns/${campaignId}/project-activity`,
          {
            method: "POST",
            body: JSON.stringify({
              action: "submit_request",
              idempotencyKey: "e2e-activity-1",
              targetKey: "destination_url",
              requestedValue: "https://e2e.example.com",
              confirmScopeDisclaimer: true,
            }),
          },
        ),
        { params: Promise.resolve({ campaignId }) },
      );
      expect(activityPost.status).toBe(200);

      const reviewRoute = await import("@/app/api/campaigns/[campaignId]/review/route");
      const reviewRes = await reviewRoute.GET(
        await requestWithSession(
          linkedUser,
          `http://localhost/api/campaigns/${campaignId}/review`,
        ),
        { params: Promise.resolve({ campaignId }) },
      );
      expect(reviewRes.status).toBe(200);

      const deliveryRoute = await import("@/app/api/campaigns/[campaignId]/delivery/route");
      const deliveryRes = await deliveryRoute.GET(
        await requestWithSession(
          linkedUser,
          `http://localhost/api/campaigns/${campaignId}/delivery`,
        ),
        { params: Promise.resolve({ campaignId }) },
      );
      expect(deliveryRes.status).toBe(200);
      const deliveryJson = (await deliveryRes.json()) as { delivery: { state: string } };
      expect(["preparing", "ready", "no_access"]).toContain(deliveryJson.delivery.state);

      const comms = await readProjectCommunicationEnvelope(campaignId);
      const activity = await readProjectActivityEnvelope(campaignId);
      expect(comms?.messages.length).toBeGreaterThan(0);
      expect(activity?.requests.length).toBeGreaterThan(0);

      await runSeparateProcessProbe(campaignId);
    }, 120_000);

    it("cleans up disposable e2e campaigns and users", async () => {
      useTestPostgresEnv();
      const { getStudioPostgresPool } = await import("./postgres-pool");
      const pool = getStudioPostgresPool();
      const campaigns = await pool.query(
        `SELECT COUNT(*)::int AS n FROM studio_campaigns WHERE campaign_id LIKE 'disposable-persistence-e2e-%'`,
      );
      const users = await pool.query(
        `SELECT COUNT(*)::int AS n FROM studio_users WHERE email_normalized LIKE 'disposable.persistence.e2e.%@example.test'`,
      );
      expect(campaigns.rows[0]?.n).toBe(0);
      expect(users.rows[0]?.n).toBe(0);
    });
  },
);
