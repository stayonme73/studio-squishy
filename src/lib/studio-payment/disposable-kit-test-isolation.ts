import { createHmac, timingSafeEqual } from "node:crypto";

import {
  CUSTOM_STUDIO_PLAN_PACKAGE_ID,
  type CampaignRecord,
} from "@/config/studio-board";
import type { RouteMapJobId, RouteMapRoadId } from "@/config/route-map-v1";
import type { TestPaymentIsolation } from "./disposable-test-isolation-types";
import {
  listCampaignEnvelopes,
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";

export const DISPOSABLE_KIT_TEST_ISOLATION_SCHEMA =
  "disposable-kit-test-isolation-v1" as const;

export const DISPOSABLE_KIT_TEST_LIST_PRICE_CENTS = 34900;
export const DISPOSABLE_KIT_TEST_THANK_YOU_DISCOUNT_CENTS = 6980;
export const DISPOSABLE_KIT_TEST_AMOUNT_DUE_CENTS = 27920;
export const DISPOSABLE_KIT_TEST_CLIENT_USER_ID = "local-disposable-kit-pay-intake";

const DISPOSABLE_KIT_TEST_ID =
  /^disposable-kit-[a-z0-9-]{6,60}$/;

function isDisposableKitTestIsolation(
  marker: TestPaymentIsolation,
): marker is DisposableKitTestIsolation {
  return (
    marker.schemaVersion === DISPOSABLE_KIT_TEST_ISOLATION_SCHEMA &&
    marker.purpose === "campaign_launch_kit_pay_intake"
  );
}

export type DisposableKitTestIsolation = {
  schemaVersion: typeof DISPOSABLE_KIT_TEST_ISOLATION_SCHEMA;
  purpose: "campaign_launch_kit_pay_intake";
  stripeMode: "test";
  disposable: true;
  /** Set by checkout after Stripe returns the test session. Absent before checkout. */
  checkoutSessionId?: string;
};

export function disposableKitTestIsolationMarker(): DisposableKitTestIsolation {
  return {
    schemaVersion: DISPOSABLE_KIT_TEST_ISOLATION_SCHEMA,
    purpose: "campaign_launch_kit_pay_intake",
    stripeMode: "test",
    disposable: true,
  };
}

export const DISPOSABLE_KIT_STRIPE_TEST_PROOF_SCHEMA =
  "disposable-kit-stripe-test-proof-v1" as const;

export type DisposableKitStripeTestProof = {
  schemaVersion: typeof DISPOSABLE_KIT_STRIPE_TEST_PROOF_SCHEMA;
  source: "stripe_webhook" | "stripe_retrieve";
  checkoutSessionId: string;
  campaignId: string;
  livemode: false;
  paymentStatus: "paid";
  verifiedAt: string;
  mac: string;
};

function proofPayload(input: {
  source: DisposableKitStripeTestProof["source"];
  campaignId: string;
  checkoutSessionId: string;
}): string {
  return [
    DISPOSABLE_KIT_STRIPE_TEST_PROOF_SCHEMA,
    input.source,
    input.campaignId,
    input.checkoutSessionId,
    "paid",
    "livemode:0",
  ].join("|");
}

function proofMac(env: NodeJS.ProcessEnv, payload: string): string | null {
  if (!stripeProcessIsTest(env)) return null;
  const secret = env.STRIPE_SECRET_KEY?.trim() ?? "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function macMatches(env: NodeJS.ProcessEnv, payload: string, mac: string): boolean {
  const expected = proofMac(env, payload);
  if (!expected || expected.length !== mac.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(mac));
}

/**
 * Writes the server-only Stripe test proof. Callers must already have verified
 * a signed webhook or a retrieved paid Checkout Session. A stored payment
 * record alone cannot produce this proof.
 */
export function sealDisposableKitStripeTestProof(input: {
  campaign: CampaignRecord;
  checkoutSessionId: string;
  source: DisposableKitStripeTestProof["source"];
  livemode: boolean;
  paymentStatus: string;
  env?: NodeJS.ProcessEnv;
  verifiedAt?: string;
}): CampaignRecord | null {
  const env = input.env ?? process.env;
  if (input.livemode !== false) return null;
  if (input.paymentStatus !== "paid") return null;
  if (env.NODE_ENV !== "test" && env.NODE_ENV !== "development") return null;
  const checkoutSessionId = input.checkoutSessionId.trim();
  if (!checkoutSessionId) return null;
  const campaign = input.campaign;
  if (campaign.campaignId.toLowerCase().includes("harbor-oak")) return null;
  if (campaign.condensedOffer?.packageId !== "campaign_launch_kit") return null;
  const isolation = campaign.testPaymentIsolation;
  if (
    !isolation ||
    isolation.purpose !== "campaign_launch_kit_pay_intake"
  ) {
    return null;
  }
  if (
    isolation.checkoutSessionId &&
    isolation.checkoutSessionId !== checkoutSessionId
  ) {
    return null;
  }
  const mac = proofMac(
    env,
    proofPayload({
      source: input.source,
      campaignId: campaign.campaignId,
      checkoutSessionId,
    }),
  );
  if (!mac) return null;
  const proof: DisposableKitStripeTestProof = {
    schemaVersion: DISPOSABLE_KIT_STRIPE_TEST_PROOF_SCHEMA,
    source: input.source,
    checkoutSessionId,
    campaignId: campaign.campaignId,
    livemode: false,
    paymentStatus: "paid",
    verifiedAt: input.verifiedAt ?? new Date().toISOString(),
    mac,
  };
  return { ...campaign, disposableKitStripeTestProof: proof };
}

function verifiedStripeTestProof(
  campaign: CampaignRecord,
  env: NodeJS.ProcessEnv,
): boolean {
  const proof = campaign.disposableKitStripeTestProof;
  if (!proof) return false;
  if (proof.schemaVersion !== DISPOSABLE_KIT_STRIPE_TEST_PROOF_SCHEMA) return false;
  if (proof.source !== "stripe_webhook" && proof.source !== "stripe_retrieve") return false;
  if (proof.livemode !== false || proof.paymentStatus !== "paid") return false;
  if (proof.campaignId !== campaign.campaignId) return false;
  if (!proof.checkoutSessionId) return false;
  if (campaign.paymentTruth?.checkoutSessionId !== proof.checkoutSessionId) return false;
  const paymentIsolation = campaign.testPaymentIsolation;
  if (
    paymentIsolation &&
    isDisposableKitTestIsolation(paymentIsolation) &&
    paymentIsolation.checkoutSessionId &&
    paymentIsolation.checkoutSessionId !== proof.checkoutSessionId
  ) {
    return false;
  }
  return macMatches(
    env,
    proofPayload({
      source: proof.source,
      campaignId: proof.campaignId,
      checkoutSessionId: proof.checkoutSessionId,
    }),
    proof.mac,
  );
}

function stripeProcessIsTest(env: NodeJS.ProcessEnv): boolean {
  const secret = env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!secret.startsWith("sk_test_")) return false;
  const mode = env.STRIPE_MODE?.trim().toLowerCase();
  return mode !== "live";
}

function selectedServicesAreKitOnly(campaign: CampaignRecord): boolean {
  const services = campaign.paymentTruth?.selectedServiceIds;
  return (
    Array.isArray(services) &&
    services.length === 1 &&
    services[0] === "campaign_launch_kit"
  );
}

/**
 * Fail closed. Production dispatch is skipped only for one disposable
 * Campaign Launch Kit whose payment is already confirmed in Stripe test mode.
 * Any missing proof keeps the normal paid recovery path.
 */
export function skipsProductionForDisposableKitTest(
  campaign: CampaignRecord,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const marker = campaign.testPaymentIsolation;
  if (
    !marker ||
    marker.schemaVersion !== DISPOSABLE_KIT_TEST_ISOLATION_SCHEMA ||
    marker.purpose !== "campaign_launch_kit_pay_intake" ||
    marker.stripeMode !== "test" ||
    marker.disposable !== true
  ) {
    return false;
  }
  if (env.NODE_ENV !== "test" && env.NODE_ENV !== "development") return false;
  if (!stripeProcessIsTest(env)) return false;
  if (campaign.campaignId.toLowerCase().includes("harbor-oak")) return false;
  if (campaign.condensedOffer?.packageId !== "campaign_launch_kit") return false;
  if (!campaign.paymentReceivedAt) return false;
  if (campaign.paymentTruth?.status !== "confirmed") return false;
  if (campaign.paymentTruth.sandbox === true) return false;
  if (!selectedServicesAreKitOnly(campaign)) return false;
  if (!verifiedStripeTestProof(campaign, env)) return false;
  return true;
}

/** A valid server marker. Production, mail, and historical recovery must stay off. */
export function disposableKitTestMustStayIsolated(campaign: CampaignRecord): boolean {
  const marker = campaign.testPaymentIsolation;
  if (!marker) return false;
  return (
    marker.schemaVersion === DISPOSABLE_KIT_TEST_ISOLATION_SCHEMA &&
    marker.purpose === "campaign_launch_kit_pay_intake" &&
    marker.stripeMode === "test" &&
    marker.disposable === true
  );
}

export function bindDisposableKitTestCheckoutSession(
  campaign: CampaignRecord,
  checkoutSessionId: string,
): { ok: true; campaign: CampaignRecord } | { ok: false; message: string } {
  if (!disposableKitTestMustStayIsolated(campaign)) {
    return { ok: true, campaign };
  }
  const sessionId = checkoutSessionId.trim();
  if (!sessionId || sessionId.startsWith("cs_sandbox_")) {
    return {
      ok: false,
      message: "This disposable kit test requires a Stripe test checkout session.",
    };
  }
  const marker = campaign.testPaymentIsolation;
  if (!marker || !isDisposableKitTestIsolation(marker)) return { ok: true, campaign };
  if (marker.checkoutSessionId && marker.checkoutSessionId !== sessionId) {
    return {
      ok: false,
      message: "This disposable kit test is already bound to a different checkout session.",
    };
  }
  if (marker.checkoutSessionId === sessionId) return { ok: true, campaign };
  return {
    ok: true,
    campaign: {
      ...campaign,
      testPaymentIsolation: { ...marker, checkoutSessionId: sessionId },
    },
  };
}

export function assertDisposableKitTestCheckout(input: {
  campaign: CampaignRecord;
  amountCents: number;
  selectedServiceIds: readonly string[];
  sandbox: boolean;
  env?: NodeJS.ProcessEnv;
}): { ok: true } | { ok: false; message: string } {
  if (!disposableKitTestMustStayIsolated(input.campaign)) return { ok: true };
  const env = input.env ?? process.env;
  if (env.NODE_ENV !== "test" && env.NODE_ENV !== "development") {
    return {
      ok: false,
      message: "This disposable kit test can run only in the local test environment.",
    };
  }
  if (!stripeProcessIsTest(env)) {
    return {
      ok: false,
      message: "This disposable kit test requires Stripe test mode.",
    };
  }
  if (input.sandbox) {
    return {
      ok: false,
      message: "This disposable kit test cannot use a sandbox checkout.",
    };
  }
  if (input.campaign.campaignId.toLowerCase().includes("harbor-oak")) {
    return {
      ok: false,
      message: "Harbor & Oak cannot be used for this disposable kit test.",
    };
  }
  if (input.campaign.condensedOffer?.packageId !== "campaign_launch_kit") {
    return {
      ok: false,
      message: "This disposable test is only for the Campaign Launch Kit.",
    };
  }
  if (
    input.campaign.condensedOffer.listPriceCents !== DISPOSABLE_KIT_TEST_LIST_PRICE_CENTS ||
    input.campaign.condensedOffer.amountDueCents !== DISPOSABLE_KIT_TEST_AMOUNT_DUE_CENTS
  ) {
    return {
      ok: false,
      message: "Campaign Launch Kit stays $349, with $279.20 due after the thank-you.",
    };
  }
  if (
    input.selectedServiceIds.length !== 1 ||
    input.selectedServiceIds[0] !== "campaign_launch_kit" ||
    input.amountCents !== DISPOSABLE_KIT_TEST_AMOUNT_DUE_CENTS
  ) {
    return {
      ok: false,
      message: "Campaign Launch Kit stays $349, with $279.20 due after the thank-you.",
    };
  }
  return { ok: true };
}

function disposableKitTestIdRefused(campaignId: string): boolean {
  const id = campaignId.trim().toLowerCase();
  if (!DISPOSABLE_KIT_TEST_ID.test(id)) return true;
  return (
    id.includes("harbor") ||
    id.includes("customer-one") ||
    id.includes("cedar") ||
    id.includes("messy-customer") ||
    id.includes("route-proof")
  );
}

/**
 * Server-only. Creates one new disposable Campaign Launch Kit and stamps the
 * isolation marker before checkout. Customers cannot call this, and a client
 * sync cannot invent the marker.
 */
export async function createDisposableCampaignLaunchKitTestProject(input: {
  campaignId: string;
  env?: NodeJS.ProcessEnv;
  now?: string;
}): Promise<
  | { ok: true; campaign: CampaignRecord }
  | { ok: false; error: string; message: string }
> {
  const env = input.env ?? process.env;
  if (env.NODE_ENV !== "test" && env.NODE_ENV !== "development") {
    return {
      ok: false,
      error: "disposable_kit_test_refused",
      message: "This disposable kit test can be created only in the local test environment.",
    };
  }
  if (!stripeProcessIsTest(env)) {
    return {
      ok: false,
      error: "disposable_kit_test_refused",
      message: "This disposable kit test requires Stripe test mode.",
    };
  }
  const campaignId = input.campaignId.trim();
  if (disposableKitTestIdRefused(campaignId)) {
    return {
      ok: false,
      error: "disposable_kit_test_refused",
      message: "The disposable kit test needs its own new project id.",
    };
  }
  const existing = await readCampaignEnvelope(campaignId);
  if (existing) {
    return {
      ok: false,
      error: "disposable_kit_test_refused",
      message: "That disposable kit test project already exists.",
    };
  }
  let envelopes: Awaited<ReturnType<typeof listCampaignEnvelopes>>;
  try {
    envelopes = await listCampaignEnvelopes();
  } catch {
    return {
      ok: false,
      error: "disposable_kit_test_refused",
      message: "Could not verify that no disposable kit test already exists.",
    };
  }
  if (envelopes.some((envelope) => disposableKitTestMustStayIsolated(envelope.record))) {
    return {
      ok: false,
      error: "disposable_kit_test_refused",
      message: "One disposable kit test project already exists.",
    };
  }
  const now = input.now ?? new Date().toISOString();
  const roadId: RouteMapRoadId = "random-exit";
  const campaign: CampaignRecord = {
    campaignId,
    campaignName: "Disposable Kit Pay Intake",
    campaignStatus: "DRAFT_RECEIVED",
    campaignDescription: "Awaiting payment confirmation.",
    estimatedCompletion: "After payment and Project Intake",
    packageId: CUSTOM_STUDIO_PLAN_PACKAGE_ID,
    packageLabel: "Campaign Launch Kit",
    revisionRoundsIncluded: 3,
    revisionRoundsIncludedSource: "package_snapshot",
    revisionRoundsUsed: 0,
    paymentReceivedAt: null,
    createdAt: now,
    updatedAt: now,
    routeMapContext: {
      selectedServiceIds: [],
      jobId: "campaign_launch_kit" as RouteMapJobId,
      roadId,
      selectedAt: now,
      currentStep: "checkout",
    },
    condensedOffer: {
      packageId: "campaign_launch_kit",
      name: "Campaign Launch Kit",
      priceCents: DISPOSABLE_KIT_TEST_LIST_PRICE_CENTS,
      listPriceCents: DISPOSABLE_KIT_TEST_LIST_PRICE_CENTS,
      thankYouDiscountCents: DISPOSABLE_KIT_TEST_THANK_YOU_DISCOUNT_CENTS,
      amountDueCents: DISPOSABLE_KIT_TEST_AMOUNT_DUE_CENTS,
      revisionRounds: 3,
      customerName: "Disposable Kit Check",
      customerEmail: "disposable-kit-pay-intake@local.dev",
      company: "Disposable Kit",
      projectNeed: "Disposable Campaign Launch Kit payment and intake check.",
      materialsNote: "",
      support: {},
    },
    testPaymentIsolation: disposableKitTestIsolationMarker(),
  };
  const saved = await upsertCampaignRecord(campaign, DISPOSABLE_KIT_TEST_CLIENT_USER_ID);
  return { ok: true, campaign: saved.record };
}
