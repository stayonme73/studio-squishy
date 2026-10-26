/**
 * Shared PREPARED-only writer for disposable Social & Promo production-truth certs.
 * Does not call recovery, dispatch, intake submit, providers, or email.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  SPRUCE_LINE_CERT_LOGO_CANONICAL_REL,
  ensureSpruceLineCertSyntheticLogo,
} from "./spruce-line-cert-synthetic-logo.mjs";

const PROOFS_ROOT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs",
);

/** @param {1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9} generation */
export function certConstants(generation) {
  if (
    generation !== 1 &&
    generation !== 2 &&
    generation !== 3 &&
    generation !== 4 &&
    generation !== 5 &&
    generation !== 6 &&
    generation !== 7 &&
    generation !== 8 &&
    generation !== 9
  ) {
    throw new Error(`Unsupported cert generation: ${generation}`);
  }
  const CAMPAIGN_ID = `disposable-social-promo-machine-cert-${generation}`;
  const JOB_ID = `${CAMPAIGN_ID}:social_and_promo_graphics`;
  const CLIENT_ID =
    generation === 1 ? "client-sp-cert-disposable" : `client-sp-cert-disposable-${generation}`;
  const CLIENT_EMAIL = generation === 1 ? "sp-cert@local.dev" : `sp-cert-${generation}@local.dev`;
  const CHECKOUT_SESSION_ID =
    generation === 1
      ? "local-disposable-sp-cert-no-charge"
      : `local-disposable-sp-cert-${generation}-no-charge`;
  const PA_PREFIX = generation === 1 ? "pa-disposable-sp-cert" : `pa-disposable-sp-cert-${generation}`;
  const assetsRel = `data/disposable-social-promo-machine-cert-${generation}`;
  return {
    generation,
    CAMPAIGN_ID,
    JOB_ID,
    CLIENT_ID,
    CLIENT_EMAIL,
    CHECKOUT_SESSION_ID,
    PA_PREFIX,
    assetsRel,
    assetsDir: path.join(process.cwd(), assetsRel),
    BRANCH_SKUS: ["v2-rtu-social-posts", "v2-rtu-promotion-graphics"],
  };
}

export const TEST_PAYMENT_ISOLATION = {
  schemaVersion: "disposable-test-isolation-v1",
  purpose: "social_and_promo_production_truth_cert",
  stripeMode: "test",
  disposable: true,
  executionPhase: "prepared",
};

/** Authoritative customer facts for cert intake + materials (never stale fixture shorthand). */
export function authoritativeSocialPromoFactsForCert(generation) {
  return buildPreparedIntakeAnswers(generation)["social_and_promo_graphics:facts"];
}

export function buildPreparedIntakeAnswers(generation = 1) {
  const rightsSuffix =
    generation === 2
      ? " (disposable cert-2 synthetic project only)."
      : generation === 3
        ? " (disposable cert-3 synthetic project only)."
        : generation === 4
          ? " (disposable cert-4 synthetic project only)."
          : generation === 5
            ? " (disposable cert-5 synthetic project only)."
            : generation === 6
              ? " (disposable cert-6 synthetic project only)."
              : generation === 7
                ? " (disposable cert-7 synthetic project only)."
                : generation === 8
                  ? " (disposable cert-8 synthetic project only)."
                  : generation === 9
                    ? " (disposable cert-9 synthetic project only)."
                    : " for this disposable test project.";
  if (
    generation === 3 ||
    generation === 4 ||
    generation === 5 ||
    generation === 6 ||
    generation === 7 ||
    generation === 8 ||
    generation === 9
  ) {
    return {
      "shared:businessName": "Spruce Line Studio",
      "shared:phone": "(555) 010-8820",
      "shared:webOrSocial": "spruceline.example/open-house",
      "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
      "social_and_promo_graphics:facts":
        "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.",
      "social_and_promo_graphics:cta": "Reserve your spot",
      "social_and_promo_graphics:rights": `I have permission to use the materials I am supplying${rightsSuffix}`,
    };
  }
  return {
    "shared:businessName": "Spruce Line Studio",
    "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
    "shared:phone": "(555) 010-8820",
    "shared:webOrSocial": "spruceline.example/open-house",
    "social_and_promo_graphics:facts":
      "Free mini-consultations Saturday 10–4. One complimentary beverage per guest. No purchase required for consultation. RSVP encouraged.",
    "social_and_promo_graphics:cta": "Reserve your spot",
    "social_and_promo_graphics:mustKeep": "Warm, welcoming, not loud or salesy",
    "social_and_promo_graphics:rights": `I have permission to use the materials I am supplying${rightsSuffix}`,
  };
}

/** Kit-only intake keys the live Social form does not collect — must not appear on cert-3. */
export const SOCIAL_PROMO_KIT_ONLY_INTAKE_KEYS = [
  "social_and_promo_graphics:prices",
  "social_and_promo_graphics:dates",
  "social_and_promo_graphics:phone",
  "social_and_promo_graphics:website",
];

const MINIMAL_SYNTHETIC_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function logoBytes(generation, repoRoot = process.cwd()) {
  if (generation >= 7) {
    const rel = SPRUCE_LINE_CERT_LOGO_CANONICAL_REL;
    const abs = path.join(repoRoot, rel);
    if (!existsSync(abs)) {
      throw new Error(
        `Cert-7+ logo missing at ${rel}. Run ensureSpruceLineCertSyntheticLogo before PREP seed.`,
      );
    }
    return readFileSync(abs);
  }
  if (generation >= 4) {
    return Buffer.from(MINIMAL_SYNTHETIC_PNG_BASE64, "base64");
  }
  return Buffer.from(
    `DISPOSABLE-SPRUCE-LINE-STUDIO-LOGO-CERT-${generation}-FIXTURE-NOT-A-REAL-BRAND\n`,
    "utf8",
  );
}

export function logoChecksum(generation, repoRoot = process.cwd()) {
  return `sha256:${createHash("sha256").update(logoBytes(generation, repoRoot)).digest("hex")}`;
}

function buildCampaignRecord(now, c) {
  const intakeDraft = buildPreparedIntakeAnswers(c.generation);
  return {
    campaignId: c.CAMPAIGN_ID,
    campaignName: `Spruce Line — Social & Promo (Cert ${c.generation} Prep)`,
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: `Disposable production-truth certification prep cert-${c.generation} — not a live customer.`,
    estimatedCompletion: "After payment and Project Intake",
    packageId: "custom-studio-plan",
    packageLabel: "Social & Promo Graphics",
    revisionRoundsIncluded: 3,
    revisionRoundsIncludedSource: "package_snapshot",
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
    routeMapContext: {
      selectedServiceIds: ["social_and_promo_graphics"],
      jobId: "social_and_promo_graphics",
      roadId: "random-exit",
      selectedAt: now,
      currentStep: "intake",
    },
    condensedOffer: {
      packageId: "social_and_promo_graphics",
      name: "Social & Promo Graphics",
      priceCents: 19900,
      listPriceCents: 19900,
      thankYouDiscountCents: 3980,
      amountDueCents: 15920,
      revisionRounds: 3,
      customerName: "Spruce Line Contact",
      customerEmail: c.CLIENT_EMAIL,
      company: "Spruce Line Studio",
      projectNeed: intakeDraft["social_and_promo_graphics:purpose"],
      materialsNote: `Synthetic logo prepared under ${c.assetsRel}/`,
      support: {
        reputation_customer_proof: "SKIP",
        ad_creative: "SKIP",
        email_and_text: "SKIP",
        menu_price_list: "SKIP",
        ai_local_visibility: "SKIP",
      },
    },
    approvedStudioPlan: {
      selectedServiceIds: ["social_and_promo_graphics"],
      includedServiceIds: ["social_and_promo_graphics"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 19900,
      monthlyTotalCents: 0,
      amountDueTodayCents: 15920,
      lineItems: [
        {
          skuId: "social_and_promo_graphics",
          serviceName: "Social & Promo Graphics",
          billingType: "one_time",
          exactPriceCents: 19900,
          priceDisplay: "$199",
          deliverables: [
            "Four coordinated square posts, 1024×1024",
            "Four matching captions",
            "Suggested posting order",
            "Campaign graphic, 1024×1024",
            "Campaign graphic, 1024×1536",
          ],
          exclusions: [],
          timingWindowLabel: "Timing varies by package.",
          revisionRule: "Three revision rounds per package snapshot.",
          clientResponsibilities: ["Files are sent from My Studio after payment."],
          executionResponsibility: "The Studio",
        },
      ],
      approvedAt: now,
    },
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 15920,
      confirmedAmountCents: 15920,
      checkoutSessionId: c.CHECKOUT_SESSION_ID,
      paymentIntentId: null,
      stripeEventId: null,
      selectedServiceIds: ["social_and_promo_graphics"],
      decisionId: `${c.PA_PREFIX}-prep`,
      factFingerprint: c.PA_PREFIX,
      draftRevision: 1,
      initiatedAt: now,
      confirmedAt: now,
      sandbox: true,
    },
    preAcceptancePaymentAuthorization: {
      decisionId: `${c.PA_PREFIX}-prep`,
      outcome: "CLEAR_TO_ACCEPT",
      paymentAuthorized: true,
      evaluatedDraftRevision: 1,
      selectedServiceIds: ["social_and_promo_graphics"],
      factFingerprint: c.PA_PREFIX,
      decisionSchemaVersion: 1,
      evaluatedAt: now,
      authorizedAt: now,
      packageId: "custom-studio-plan",
    },
    postPayActivation: {
      schemaVersion: 1,
      status: "activated",
      phase: "awaiting_intake",
      activatedAt: now,
      lastAttemptAt: now,
      checkoutSessionId: c.CHECKOUT_SESSION_ID,
      paymentIntentId: null,
      stripeEventId: null,
      jobIds: [c.JOB_ID],
      taskCount: 1,
      intakeComplete: false,
      blockingRequiredMaterialsCount: 1,
      ownerActionRequired: false,
      lastError: null,
    },
    routeMapIntakeDraft: {
      answers: intakeDraft,
      savedAt: now,
    },
    materialsSummary: {
      blockingRequiredCount: 1,
      updatedAt: now,
    },
    testPaymentIsolation: TEST_PAYMENT_ISOLATION,
  };
}

function buildTasksEnvelope(now, c) {
  return {
    campaignId: c.CAMPAIGN_ID,
    planFingerprint: "social_and_promo_graphics:one_time",
    planVersion: 1,
    tasks: [
      {
        id: "campaign:producer-kickoff",
        title: "Producer kickoff",
        phase: "strategy",
        status: "not_ready",
        relatedServiceIds: ["social_and_promo_graphics"],
        familyId: "campaign_launch_monthly",
        catalogFamilyId: "campaign",
        serviceName: "Campaign",
        dependsOn: [],
        workflowState: "unstarted",
        responsibleRole: "producer_dispatcher",
      },
    ],
    jobRecords: [
      {
        jobId: c.JOB_ID,
        campaignId: c.CAMPAIGN_ID,
        skuId: "social_and_promo_graphics",
        serviceName: "Social & Promo Graphics",
        spineStatus: "waiting_on_client",
        productionLane: "standard",
        intakeComplete: false,
        productionStartedAt: null,
        ownerApprovalPending: null,
        laneQueuedAt: now,
        fileRegistry: [],
        updatedAt: now,
      },
    ],
    jobActivityEvents: [],
    jobReviewFeedback: [],
    updatedAt: now,
    version: 1,
    syncedAt: now,
  };
}

function buildMaterialsEnvelope(now, c) {
  const logoRel = `${c.assetsRel}/materials/spruce-line-logo.png`;
  return {
    campaignId: c.CAMPAIGN_ID,
    items: [
      {
        id: "condensed-social-facts",
        category: "factual-confirmation",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "text",
        label: "Facts the graphics need",
        clientFacingLabel: "Facts the graphics need",
        clientFacingPrompt: "Add the facts, prices, or disclosures these graphics need to include.",
        reason: "Social & Promo Graphics",
        relatedServiceIds: ["social_and_promo_graphics"],
        uploadStatus: "none",
        storageRef: null,
        isolatedSlot: true,
        preparedText: buildPreparedIntakeAnswers(c.generation)["social_and_promo_graphics:facts"],
      },
      {
        id: "condensed-social-logo",
        category: "logo-brand",
        requirementLevel: "optional",
        reviewStatus: "needs_clarification",
        contentKind: "file-metadata",
        label: "Your logo, if you have one",
        clientFacingLabel: "Your logo, if you have one",
        clientFacingPrompt: "If you have a logo, add it here.",
        reason: "Social & Promo Graphics",
        relatedServiceIds: ["social_and_promo_graphics"],
        uploadStatus: "none",
        storageRef: null,
        isolatedSlot: true,
        preparedLocalPath: logoRel,
        preparedRightsNote: `Synthetic test asset — Spruce Line cert-${c.generation} disposable only. Customer will confirm ownership at execution.`,
      },
    ],
    updatedAt: now,
    version: 1,
    syncedAt: now,
  };
}

async function ensureClientUser(c) {
  const usersPath = path.join(process.cwd(), "data", "studio-users.json");
  let users = [];
  try {
    users = JSON.parse(await readFile(usersPath, "utf8"));
  } catch {
    users = [];
  }
  const row = {
    id: c.CLIENT_ID,
    email: c.CLIENT_EMAIL,
    password: "dev-only",
    displayName: `Spruce Line Cert ${c.generation}`,
    roles: ["client"],
    currentCampaignId: c.CAMPAIGN_ID,
  };
  const existing = users.find((u) => u.id === c.CLIENT_ID);
  if (existing) Object.assign(existing, row);
  else users.push(row);
  await writeFile(usersPath, JSON.stringify(users, null, 2));
}

/**
 * @param {1 | 2 | 3} generation
 */
export async function writeSocialPromoMachineCertPrepFiles(generation) {
  const c = certConstants(generation);
  if (generation >= 7) {
    await ensureSpruceLineCertSyntheticLogo(process.cwd());
  }
  const now = new Date().toISOString();
  const campaigns = path.join(process.cwd(), "data", "campaigns");
  const tasks = path.join(process.cwd(), "data", "campaign-tasks");
  const materials = path.join(process.cwd(), "data", "campaign-materials");

  await mkdir(campaigns, { recursive: true });
  await mkdir(tasks, { recursive: true });
  await mkdir(materials, { recursive: true });
  await mkdir(path.join(c.assetsDir, "materials"), { recursive: true });
  await mkdir(PROOFS_ROOT, { recursive: true });

  const logoPath = path.join(c.assetsDir, "materials", "spruce-line-logo.png");
  await writeFile(logoPath, logoBytes(generation, process.cwd()));

  const record = buildCampaignRecord(now, c);
  if (!record.approvedStudioPlan?.lineItems?.length) {
    throw new Error("Cert seed requires approvedStudioPlan.lineItems.");
  }
  if (record.routeMapIntakeSubmittedAt) {
    throw new Error("PREP seed must not stamp submitted intake.");
  }
  if (record.dispatchExecution || record.routingHandoff || record.socialPromoRenderRelease) {
    throw new Error("PREP seed must not include Machine or render-release state.");
  }

  const campaignEnvelope = {
    campaignId: c.CAMPAIGN_ID,
    clientUserId: c.CLIENT_ID,
    syncVersion: 1,
    syncedAt: now,
    record,
  };

  await writeFile(
    path.join(campaigns, `${c.CAMPAIGN_ID}.json`),
    JSON.stringify(campaignEnvelope, null, 2),
  );
  await writeFile(
    path.join(tasks, `${c.CAMPAIGN_ID}.json`),
    JSON.stringify(buildTasksEnvelope(now, c), null, 2),
  );
  await writeFile(
    path.join(materials, `${c.CAMPAIGN_ID}.json`),
    JSON.stringify(buildMaterialsEnvelope(now, c), null, 2),
  );

  await ensureClientUser(c);

  const baseline = {
    generatedAt: now,
    generation: c.generation,
    campaignId: c.CAMPAIGN_ID,
    jobId: c.JOB_ID,
    clientId: c.CLIENT_ID,
    clientEmail: c.CLIENT_EMAIL,
    checkoutSessionId: c.CHECKOUT_SESSION_ID,
    testPaymentIsolation: TEST_PAYMENT_ISOLATION,
    branchSkus: c.BRANCH_SKUS,
    approvedStudioPlanLineItems: record.approvedStudioPlan.lineItems.length,
    paymentSandbox: record.paymentTruth.sandbox,
    routeMapIntakeSubmittedAt: null,
    routeMapIntakeDraftPresent: true,
    socialPromoRenderRelease: false,
    dispatchExecutionPresent: false,
    routingHandoffPresent: false,
    productionArtifactsDir: `data/campaign-design-artifacts/${c.CAMPAIGN_ID}`,
    logoFixture: {
      path: logoPath.replace(/\\/g, "/"),
      checksumSha256: logoChecksum(generation),
      byteLength: logoBytes(generation, process.cwd()).length,
      ...(generation >= 7
        ? { visualAsset: "spruce-line-studio-test-logo-v1.png (512×512 synthetic)" }
        : {}),
    },
    ...(generation === 8
      ? {
          cert8ReadinessNote:
            "Post review-sync + logo-binding repair; first execution generation after Cert-7 consumed slot.",
        }
      : {}),
    ...(generation === 9
      ? {
          cert9ReadinessNote:
            "Post review-prep performance + harness repair; first execution slot after Cert-8 consumed.",
        }
      : {}),
    machineActivityTriggeredBySeed: false,
  };

  const baselineName =
    generation === 1 ? "baseline.json" : `baseline-cert-${generation}.json`;
  await writeFile(path.join(PROOFS_ROOT, baselineName), JSON.stringify(baseline, null, 2));
  if (generation === 2) {
    await writeFile(
      path.join(PROOFS_ROOT, "cert-2-prep-baseline-2026-10-24.json"),
      JSON.stringify(baseline, null, 2),
    );
  }
  if (generation === 3) {
    await writeFile(
      path.join(PROOFS_ROOT, "cert-3-prep-baseline-2026-10-24.json"),
      JSON.stringify(baseline, null, 2),
    );
  }

  return baseline;
}
