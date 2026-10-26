import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "fs";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { CampaignRecord } from "@/config/studio-board";
import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import { studioCustomerIdentitySafetyGateV1 } from "@/config/studio-customer-identity-safety-gate-v1";
import { studioDispatchV1 } from "@/config/studio-dispatch-v1";
import {
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import { writeCheckoutSessionBinding } from "@/lib/studio-payment/events-store";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";
import * as designRendererObserver from "@/lib/studio-dispatch/design-renderer-observer";
import * as launchMenuObserver from "@/lib/studio-dispatch/launch-menu-production-observer";
import {
  evaluateCustomerIdentitySafetyGate,
  isCustomerIdentityBlocked,
  recoverResolvedCustomerIdentityHold,
  resolveCustomerIdentitySafetyCustomerCopy,
} from "@/lib/studio-customer-identity-safety-gate";
import { identitySessionFromRequest } from "@/lib/studio-customer-identity-safety-gate/session";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { wakePaidCampaignEnvelope } from "@/lib/studio-paid-activation-recovery";
import { resolveBoardNextActionPresentation } from "@/lib/studio-board-next-action";

const FLYER = ["v2-rtu-flyer"] as const;
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const TASKS_DIR = path.join(process.cwd(), "data", "campaign-tasks");
const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");
const PAYMENT_SESSIONS_DIR = path.join(process.cwd(), "data", "payment-sessions");
const MAYA_FILE = path.join(CAMPAIGNS_DIR, `${MAYA_PROTECTED_CAMPAIGN_ID}.json`);

function hashMayaFile(): string {
  return createHash("sha256").update(readFileSync(MAYA_FILE)).digest("hex");
}

function paidCampaign(
  campaignId: string,
  overrides: Partial<CampaignRecord> = {},
): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals([...FLYER]);
  const lineItems = buildServiceScopeSnapshot([...FLYER]);
  return {
    campaignId,
    campaignName: "Harbor & Co.",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Paid — identity gate test",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: totals.amountDueTodayCents,
      confirmedAmountCents: totals.amountDueTodayCents,
      checkoutSessionId: `cs_test_${campaignId}`,
      paymentIntentId: `pi_test_${campaignId}`,
      stripeEventId: `evt_test_${campaignId}`,
      selectedServiceIds: [...FLYER],
      decisionId: `dec_${campaignId}`,
      factFingerprint: `fp_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
      sandbox: true,
    },
    projectDetailsSubmittedAt: now,
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: {
      answers: {},
      submittedAt: now,
    },
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [...FLYER],
      includedServiceIds: [...FLYER],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems,
      approvedAt: now,
    },
    ...overrides,
  };
}

async function seedClearedMaterials(campaignId: string): Promise<void> {
  const now = new Date().toISOString();
  const items: CampaignMaterialItem[] = [
    {
      id: "logo-cleared",
      category: "logo-brand",
      requirementLevel: "required",
      reviewStatus: "approved_for_use",
      contentKind: "file-metadata",
      label: "Logo",
      reason: "Brand mark",
      relatedServiceIds: [...FLYER],
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

async function cleanupCampaign(campaignId: string): Promise<void> {
  await Promise.all([
    fs.unlink(path.join(CAMPAIGNS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(TASKS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(MATERIALS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(PAYMENT_SESSIONS_DIR, `cs_test_${campaignId}.json`)).catch(
      () => undefined,
    ),
  ]);
}

function baseContext(campaign: CampaignRecord) {
  return {
    activeCampaignId: campaign.campaignId,
    campaign,
    clientUserId: "customer-b",
    sessionCurrentCampaignId: campaign.campaignId,
    sessionClientUserId: "customer-b",
    paymentBindingCampaignId: campaign.campaignId,
    paymentPayerClientUserId: "customer-b",
    paymentSelectedServiceIds: [...FLYER],
    intakeCampaignId: campaign.campaignId,
    materialsCampaignId: campaign.campaignId,
    jobPacketCampaignIds: [campaign.campaignId],
    frozenProtectedCampaignId: MAYA_PROTECTED_CAMPAIGN_ID,
  };
}

describe("STUDIO-OPERATING-MACHINE-CUSTOMER-IDENTITY-SAFETY-GATE-1", () => {
  const ids: string[] = [];
  const productionSpies: Array<ReturnType<typeof vi.spyOn>> = [];

  beforeEach(() => {
    productionSpies.push(
      vi.spyOn(designRendererObserver, "runDesignRendererDispatchObserver"),
      vi.spyOn(launchMenuObserver, "runLaunchMenuProductionObserver"),
    );
  });

  afterEach(async () => {
    for (const spy of productionSpies.splice(0)) spy.mockRestore();
    vi.restoreAllMocks();
    await Promise.all(ids.splice(0).map((id) => cleanupCampaign(id)));
  });

  it("correct customer + correct campaign → identity PASS", () => {
    const campaign = paidCampaign("customer-b-clean");
    const verdict = evaluateCustomerIdentitySafetyGate(baseContext(campaign));
    expect(verdict.ok).toBe(true);
  });

  it("fresh Customer B with stale Customer A pointer → FAIL CLOSED", () => {
    const campaign = paidCampaign("customer-b-fresh");
    const verdict = evaluateCustomerIdentitySafetyGate({
      ...baseContext(campaign),
      sessionCurrentCampaignId: MAYA_PROTECTED_CAMPAIGN_ID,
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.blocker).toBe("CUSTOMER_CONTEXT_MISMATCH");
    expect(verdict.mismatchKind).toBe("stale_campaign_pointer");
    expect(verdict.ownerActionRequired).toBe(false);
  });

  it("payment Customer B + Intake Customer A → FAIL CLOSED", () => {
    const campaign = paidCampaign("customer-b-paid");
    const verdict = evaluateCustomerIdentitySafetyGate({
      ...baseContext(campaign),
      paymentBindingCampaignId: campaign.campaignId,
      intakeCampaignId: MAYA_PROTECTED_CAMPAIGN_ID,
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.mismatchKind).toBe("intake_campaign_mismatch");
  });

  it("job packet Customer A + current campaign Customer B → FAIL CLOSED", () => {
    const campaign = paidCampaign("customer-b-jobs");
    const verdict = evaluateCustomerIdentitySafetyGate({
      ...baseContext(campaign),
      jobPacketCampaignIds: [MAYA_PROTECTED_CAMPAIGN_ID],
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.mismatchKind).toBe("job_packet_campaign_mismatch");
  });

  it("does not guess or prefer the older paid campaign", () => {
    const campaign = paidCampaign("customer-b-newer");
    const verdict = evaluateCustomerIdentitySafetyGate({
      ...baseContext(campaign),
      sessionCurrentCampaignId: MAYA_PROTECTED_CAMPAIGN_ID,
    });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.expectedCampaignId).toBe(campaign.campaignId);
    expect(verdict.foundCampaignId).toBe(MAYA_PROTECTED_CAMPAIGN_ID);
  });

  it("customer copy is calm and hides engineering jargon", () => {
    const copy = studioCustomerIdentitySafetyGateV1.customerCopy;
    expect(copy.lead).toBe(
      "We're verifying your project information before production begins. Nothing is required from you right now.",
    );
    expect(copy.lead).not.toMatch(/CUSTOMER_CONTEXT_MISMATCH|campaignId|dispatch|Maya/i);
    const campaign = paidCampaign("copy-hold", {
      dispatchExecution: {
        schemaVersion: 1,
        status: studioDispatchV1.envelopeStatuses.identityBlocked,
        evaluatedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        activationCheckoutSessionId: "cs",
        records: [],
        ownerActionRequired: false,
        customerIdentitySafety: {
          packageId: studioCustomerIdentitySafetyGateV1.packageId,
          status: "blocked",
          blocker: "CUSTOMER_CONTEXT_MISMATCH",
          mismatchKind: "stale_campaign_pointer",
          recoveryPath: "engineering_system_recovery",
          ownerActionRequired: false,
          expectedCampaignId: "copy-hold",
          foundCampaignId: MAYA_PROTECTED_CAMPAIGN_ID,
          evaluatedAt: new Date().toISOString(),
        },
      },
    });
    const shown = resolveCustomerIdentitySafetyCustomerCopy(campaign);
    expect(shown?.lead).toBe(copy.lead);
    const board = resolveBoardNextActionPresentation({ campaign });
    expect(board.lead).toBe(copy.lead);
    expect(board.action).toBeNull();
  });

  it("ensureDispatch: correct customer + campaign dispatches without identity blocker", async () => {
    const campaignId = `idgate-pass-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId);
    await upsertCampaignRecord(campaign, "customer-b");
    await seedClearedMaterials(campaignId);
    await writeCheckoutSessionBinding({
      checkoutSessionId: campaign.paymentTruth!.checkoutSessionId!,
      campaignId,
      expectedAmountCents: campaign.paymentTruth!.expectedAmountCents,
      currency: "usd",
      selectedServiceIds: [...FLYER],
      decisionId: campaign.paymentTruth!.decisionId,
      factFingerprint: campaign.paymentTruth!.factFingerprint,
      draftRevision: 1,
      createdAt: new Date().toISOString(),
      payerClientUserId: "customer-b",
    });

    const result = await ensureDispatchExecution(campaign, {
      sessionCurrentCampaignId: campaignId,
      sessionClientUserId: "customer-b",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.campaign.dispatchExecution?.customerIdentitySafety?.status).not.toBe(
      "blocked",
    );
    expect(result.error).toBeUndefined();
    expect(designRendererObserver.runDesignRendererDispatchObserver).toHaveBeenCalled();
    expect(launchMenuObserver.runLaunchMenuProductionObserver).toHaveBeenCalled();
  });

  it("ensureDispatch: stale Customer A pointer FAIL CLOSED and does not invoke Production", async () => {
    const campaignId = `idgate-stale-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId);
    await upsertCampaignRecord(campaign, "customer-b");
    await seedClearedMaterials(campaignId);

    const result = await ensureDispatchExecution(campaign, {
      sessionCurrentCampaignId: MAYA_PROTECTED_CAMPAIGN_ID,
      sessionClientUserId: "customer-b",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("customer_context_mismatch");
    expect(result.dispatch?.status).toBe("identity_blocked");
    expect(result.dispatch?.customerIdentitySafety?.blocker).toBe(
      "CUSTOMER_CONTEXT_MISMATCH",
    );
    expect(result.campaign.revisionRoundsUsed ?? 0).toBe(0);
    expect(designRendererObserver.runDesignRendererDispatchObserver).not.toHaveBeenCalled();
    expect(launchMenuObserver.runLaunchMenuProductionObserver).not.toHaveBeenCalled();
  });

  it("clears a stale browser-pointer hold once the session matches, without Production", async () => {
    const campaignId = `idgate-hold-recover-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId);
    await upsertCampaignRecord(campaign, "customer-b");
    await seedClearedMaterials(campaignId);

    const blocked = await ensureDispatchExecution(campaign, {
      sessionCurrentCampaignId: "camp-clip-full-cust-cert-20261002",
      sessionClientUserId: "customer-b",
    });
    expect(blocked.ok).toBe(false);
    expect(isCustomerIdentityBlocked(blocked.campaign)).toBe(true);
    vi.clearAllMocks();

    const stillBlocked = await recoverResolvedCustomerIdentityHold(blocked.campaign, {
      sessionCurrentCampaignId: "camp-clip-full-cust-cert-20261002",
      sessionClientUserId: "customer-b",
    });
    expect(isCustomerIdentityBlocked(stillBlocked)).toBe(true);

    const now = new Date().toISOString();
    const activated = await upsertCampaignRecord(
      {
        ...stillBlocked,
        postPayActivation: {
          schemaVersion: 1,
          status: "activated",
          phase: "ready_for_routing",
          activatedAt: now,
          lastAttemptAt: now,
          checkoutSessionId: stillBlocked.paymentTruth!.checkoutSessionId!,
          paymentIntentId: null,
          stripeEventId: null,
          jobIds: [`${campaignId}:v2-rtu-flyer`],
          taskCount: 4,
          intakeComplete: true,
          blockingRequiredMaterialsCount: 0,
          ownerActionRequired: false,
          lastError: null,
        },
      },
      "customer-b",
    );

    const envelope = await readCampaignEnvelope(campaignId);
    expect(envelope).toBeTruthy();
    const woken = await wakePaidCampaignEnvelope(envelope!, {
      sessionCurrentCampaignId: campaignId,
      sessionClientUserId: "customer-b",
    });
    expect(isCustomerIdentityBlocked(woken.record)).toBe(false);
    expect(woken.record.dispatchExecution?.status).not.toBe("identity_blocked");
    expect(resolveCustomerIdentitySafetyCustomerCopy(woken.record)).toBeNull();
    expect(designRendererObserver.runDesignRendererDispatchObserver).not.toHaveBeenCalled();
    expect(launchMenuObserver.runLaunchMenuProductionObserver).not.toHaveBeenCalled();
  });

  it("ensureDispatch: payment B + Intake A FAIL CLOSED without Production", async () => {
    const campaignId = `idgate-intake-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId);
    await upsertCampaignRecord(campaign, "customer-b");
    await seedClearedMaterials(campaignId);

    const result = await ensureDispatchExecution(campaign, {
      sessionCurrentCampaignId: campaignId,
      sessionClientUserId: "customer-b",
      intakeCampaignId: MAYA_PROTECTED_CAMPAIGN_ID,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.dispatch?.customerIdentitySafety?.mismatchKind).toBe(
      "intake_campaign_mismatch",
    );
    expect(designRendererObserver.runDesignRendererDispatchObserver).not.toHaveBeenCalled();
  });

  it("ensureDispatch: job packet A + current B FAIL CLOSED without Production", async () => {
    const campaignId = `idgate-packet-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId);
    await upsertCampaignRecord(campaign, "customer-b");
    await seedClearedMaterials(campaignId);

    const result = await ensureDispatchExecution(campaign, {
      sessionCurrentCampaignId: campaignId,
      sessionClientUserId: "customer-b",
      jobPacketCampaignIds: [MAYA_PROTECTED_CAMPAIGN_ID],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.dispatch?.customerIdentitySafety?.mismatchKind).toBe(
      "job_packet_campaign_mismatch",
    );
    expect(designRendererObserver.runDesignRendererDispatchObserver).not.toHaveBeenCalled();
  });

  it("frozen Maya + fresh Customer-One: fresh proceeds, Maya untouched", async () => {
    const before = hashMayaFile();
    const freeze = JSON.parse(readFileSync(MAYA_FILE, "utf8"));
    expect(freeze.record?.productionFreeze?.renderVersion).toBe(16);
    expect(freeze.record?.productionFreeze?.doNotRemint).toBe(true);

    const campaignId = `idgate-fresh-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId, {
      campaignName: "Harbor & Co.",
    });
    await upsertCampaignRecord(campaign, "customer-one-fresh");
    await seedClearedMaterials(campaignId);

    const result = await ensureDispatchExecution(campaign, {
      sessionCurrentCampaignId: campaignId,
      sessionClientUserId: "customer-one-fresh",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.campaign.campaignId).toBe(campaignId);
    expect(result.campaign.dispatchExecution?.customerIdentitySafety?.status).not.toBe(
      "blocked",
    );
    expect(designRendererObserver.runDesignRendererDispatchObserver).toHaveBeenCalled();

    const after = hashMayaFile();
    expect(after).toBe(before);
    expect(JSON.parse(readFileSync(MAYA_FILE, "utf8")).record.productionFreeze.renderVersion).toBe(
      16,
    );
  });

  it("ensure.ts runs the identity gate before Production observers", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/studio-dispatch/ensure.ts"),
      "utf8",
    );
    const fnStart = source.indexOf("export async function ensureDispatchExecution");
    const gate = source.indexOf("failClosedIdentity(working", fnStart);
    const observer = source.indexOf("return attachDesignRendererObserver", fnStart);
    expect(gate).toBeGreaterThan(fnStart);
    expect(observer).toBeGreaterThan(gate);
    expect(source).toContain("evaluateCustomerIdentitySafetyGate");
  });

  it("browser boarding-pass header is preferred over the dispatch campaign id", () => {
    const request = new Request("https://studio.test/api/campaigns/current", {
      headers: {
        [studioCustomerIdentitySafetyGateV1.browserCampaignHeader]: "customer-b",
      },
    });
    const session = identitySessionFromRequest(request, "customer-b", MAYA_PROTECTED_CAMPAIGN_ID);
    expect(session.sessionCurrentCampaignId).toBe("customer-b");
    expect(session.sessionClientUserId).toBe("customer-b");
  });

  it("Board campaign fetches send the browser boarding-pass header", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/use-current-campaign.ts"),
      "utf8",
    );
    expect(source).toContain("studioCustomerIdentitySafetyGateV1.browserCampaignHeader");
    expect(source).toContain("campaignIdentityHeaders");
  });
});
