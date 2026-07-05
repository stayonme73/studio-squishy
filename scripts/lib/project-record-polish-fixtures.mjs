/**
 * Project Record polish — four deterministic campaign fixtures.
 *
 * empty   — paid campaign, no submitted archive sections yet
 * partial — editable intake with mixed answers and missing fields
 * complete — full submitted Project Details, editable
 * locked  — same submitted archive as complete, intake locked
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CLIENT_DISPLAY_NAME,
  CLIENT_EMAIL,
  CLIENT_PASSWORD,
  CLIENT_USER_ID,
  SEED_AT,
  SOCIAL_SKU_ID,
} from "../setup-studio-test-batch-1-client-walkthrough.mjs";

export const FIXTURE_PREFIX = "studio-record-polish";

export const FIXTURE_IDS = {
  empty: `${FIXTURE_PREFIX}-empty`,
  partial: `${FIXTURE_PREFIX}-partial`,
  complete: `${FIXTURE_PREFIX}-complete`,
  locked: `${FIXTURE_PREFIX}-locked`,
};

export const FIXTURE_CLIENT = {
  userId: CLIENT_USER_ID,
  email: CLIENT_EMAIL,
  password: CLIENT_PASSWORD,
  displayName: CLIENT_DISPLAY_NAME,
};

const PATHS = {
  campaigns: path.join(process.cwd(), "data", "campaigns"),
  users: path.join(process.cwd(), "data", "studio-users.json"),
};

const SOCIAL_LINE_ITEM = {
  skuId: SOCIAL_SKU_ID,
  serviceId: SOCIAL_SKU_ID,
  serviceName: "Make My Social Media Posts",
  billingType: "one_time",
  exactPriceCents: 45000,
  priceCents: 45000,
  priceDisplay: "$450",
  deliverables: ["4 static social media post graphics for one campaign/theme"],
  exclusions: [],
  timingWindowLabel: "Usually within 3-5 business days after intake is complete.",
  revisionRule: "1 revision round",
  clientResponsibilities: ["Provide brand and campaign details"],
  executionResponsibility: "studio",
};

function approvedPlan() {
  return {
    selectedServiceIds: [SOCIAL_SKU_ID],
    includedServiceIds: [SOCIAL_SKU_ID],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: 45000,
    monthlyTotalCents: 0,
    amountDueTodayCents: 45000,
    lineItems: [SOCIAL_LINE_ITEM],
    approvedAt: SEED_AT,
  };
}

function baseRecord(campaignId, campaignName, campaignStatus, extras = {}) {
  return {
    campaignId,
    campaignName,
    campaignStatus,
    campaignDescription: "Project Record polish validation fixture.",
    estimatedCompletion: "Approximately 7 business days",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: SEED_AT,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Jul 4", message: "Project Record polish fixture." }],
    createdAt: SEED_AT,
    updatedAt: SEED_AT,
    ...extras,
  };
}

/** Paid campaign with plan but no submitted archive sections yet. */
export function buildEmptyRecord() {
  return baseRecord(
    FIXTURE_IDS.empty,
    "Project Record Polish — Empty",
    "PAYMENT_RECEIVED",
    {
      approvedStudioPlan: approvedPlan(),
    },
  );
}

const PARTIAL_PROJECT_DETAILS_FORM = {
  workingOn: "Client-led Social Posts walkthrough",
  mainOffer: "",
  importantDates: "July 2026 internal walkthrough window",
  callToAction: "",
  destinationLink: "",
  mustIncludeExactly: "",
  brandColorsFonts: "",
  inspirationLinks: "",
  brandDoNotUse: "",
  brandOutdatedParts: "",
  brandPartsToKeep: "",
  socialPlatforms: "",
  socialAccountLinks: "",
  socialPostingWindow: "",
  emailPlatform: "",
  emailSender: "",
  emailSendTiming: "",
  emailListReady: "",
  conceptIntendedUse: "",
  conceptAudience: "",
  conceptRequiredWording: "",
  marketingPieces: SOCIAL_LINE_ITEM.serviceName,
  marketingPieceUsage: "Client walkthrough only.",
  marketingFormats: "",
  adScript: "",
  adIntendedUse: "",
  adVoiceStyle: "",
  adPronunciation: "",
  primaryApproverName: FIXTURE_CLIENT.displayName,
  primaryApproverEmail: FIXTURE_CLIENT.email,
  hasSecondaryApprover: "no",
  secondaryApproverName: "",
  secondaryApproverEmail: "",
};

/** Editable campaign with plan + partial Project Details and missing-field section. */
export function buildPartialRecord() {
  return baseRecord(
    FIXTURE_IDS.partial,
    "Project Record Polish — Partial",
    "PAYMENT_RECEIVED",
    {
      approvedStudioPlan: approvedPlan(),
      projectDetailsSubmittedAt: SEED_AT,
      projectDetails: {
        form: PARTIAL_PROJECT_DETAILS_FORM,
        files: [],
        submittedAt: SEED_AT,
      },
    },
  );
}

const COMPLETE_PROJECT_DETAILS_FORM = {
  workingOn: "Summer bakery launch social posts",
  mainOffer: "Fresh pastries every morning — limited-time opening offer",
  importantDates: "Launch week: July 7–14, 2026",
  callToAction: "Visit the shop or order online",
  destinationLink: "https://example.local/tagia-bakery-launch",
  mustIncludeExactly: "Include hashtag #TagiaFresh and opening-week dates.",
  brandColorsFonts: "Teal and cream; use existing Studio brand direction.",
  inspirationLinks: "Hand-drawn menu boards, warm natural light photography.",
  brandDoNotUse: "Cold corporate stock imagery.",
  brandOutdatedParts: "",
  brandPartsToKeep: "Keep the teal accent and handwritten headline style.",
  socialPlatforms: "Instagram feed, square 1080 x 1080 px",
  socialAccountLinks: "@tagiabakery (client-owned account; no Studio posting access)",
  socialPostingWindow: "Client will post during launch week.",
  emailPlatform: "",
  emailSender: "",
  emailSendTiming: "",
  emailListReady: "",
  conceptIntendedUse: "",
  conceptAudience: "Local families within 10 miles",
  conceptRequiredWording: "",
  marketingPieces: SOCIAL_LINE_ITEM.serviceName,
  marketingPieceUsage: "Organic social only for launch week.",
  marketingFormats: "Static square posts",
  adScript: "",
  adIntendedUse: "",
  adVoiceStyle: "",
  adPronunciation: "",
  primaryApproverName: FIXTURE_CLIENT.displayName,
  primaryApproverEmail: FIXTURE_CLIENT.email,
  hasSecondaryApprover: "no",
  secondaryApproverName: "",
  secondaryApproverEmail: "",
};

const COMPLETE_VISION_DATA = {
  project: "Summer bakery launch social posts",
  projectStarter: "other",
  projectDetail: "Summer bakery launch social posts",
  business: "Tagia Bakery",
  audienceFit: "local",
  audienceNotes: "Families within 10 miles",
  message: "Fresh pastries every morning",
  goalSelections: ["awareness"],
  goalNotes: "Drive foot traffic during launch week",
  brandPersonalitySelections: ["warm"],
  brandPersonalityNotes: "",
  brandHasColors: "yes",
  brandColorList: "Teal and cream",
  brandColorSelections: [],
  brandColorNotes: "",
  visionFeel: "Welcoming and bright",
  visionRemember: "The smell of fresh bread",
  visionDesired: "More weekend visits",
  visionSuccess: "Busy opening week with repeat customers",
  visionAvoid: "Generic stock photos",
  inspirationLike: "Hand-drawn menu boards",
  inspirationDislike: "Cold corporate ads",
  anythingElse: "Launch before July 14",
};

/** Full submitted archive — editable while status remains PAYMENT_RECEIVED. */
export function buildCompleteRecord() {
  return baseRecord(
    FIXTURE_IDS.complete,
    "Project Record Polish — Complete",
    "PAYMENT_RECEIVED",
    {
      approvedStudioPlan: approvedPlan(),
      projectDetailsSubmittedAt: SEED_AT,
      projectDetails: {
        form: COMPLETE_PROJECT_DETAILS_FORM,
        files: [],
        submittedAt: SEED_AT,
      },
      visionData: COMPLETE_VISION_DATA,
      visionSubmittedAt: SEED_AT,
    },
  );
}

/** Full submitted archive with intake locked for production. */
export function buildLockedRecord() {
  return {
    ...buildCompleteRecord(),
    campaignId: FIXTURE_IDS.locked,
    campaignName: "Project Record Polish — Locked",
    campaignStatus: "BUILDING_CONCEPTS",
  };
}

function campaignEnvelope(record) {
  return {
    campaignId: record.campaignId,
    clientUserId: FIXTURE_CLIENT.userId,
    syncVersion: 1,
    syncedAt: SEED_AT,
    record,
  };
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function ensureUsers() {
  await mkdir(path.dirname(PATHS.users), { recursive: true });
  const users = await readJson(PATHS.users, []);
  const byId = new Map(users.map((user) => [user.id, user]));
  const fixtureCampaignIds = Object.values(FIXTURE_IDS);
  const existing = byId.get(FIXTURE_CLIENT.userId);
  const mergedCampaignIds = [
    ...new Set([...(existing?.clientCampaignIds ?? []), ...fixtureCampaignIds]),
  ];

  byId.set(FIXTURE_CLIENT.userId, {
    id: FIXTURE_CLIENT.userId,
    email: FIXTURE_CLIENT.email,
    password: FIXTURE_CLIENT.password,
    displayName: FIXTURE_CLIENT.displayName,
    roles: ["client"],
    currentCampaignId: existing?.currentCampaignId ?? FIXTURE_IDS.partial,
    clientCampaignIds: mergedCampaignIds,
  });

  await writeFile(PATHS.users, JSON.stringify([...byId.values()], null, 2), "utf8");
}

export async function setupProjectRecordPolishFixtures() {
  await mkdir(PATHS.campaigns, { recursive: true });
  await ensureUsers();

  const records = [
    buildEmptyRecord(),
    buildPartialRecord(),
    buildCompleteRecord(),
    buildLockedRecord(),
  ];

  for (const record of records) {
    const filePath = path.join(PATHS.campaigns, `${record.campaignId}.json`);
    await writeFile(filePath, JSON.stringify(campaignEnvelope(record), null, 2), "utf8");
  }

  return {
    fixtureIds: FIXTURE_IDS,
    login: FIXTURE_CLIENT,
    boardPath: (id) => `/studio-board?campaignId=${id}`,
  };
}
