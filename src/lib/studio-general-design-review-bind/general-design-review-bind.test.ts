/**
 * STUDIO-OPERATING-GENERAL-DESIGN-REVIEW-BIND-1
 * Fail-closed Review authorization + customer-facing proof presentation.
 */

import { createHash } from "crypto";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";

import type { CampaignRecord } from "@/config/studio-board";
import { studioGeneralDesignReviewBindV1 } from "@/config/studio-general-design-review-bind-v1";
import { SYNTHETIC_PNG_1X1_BYTES } from "@/lib/studio-customer-content-intake";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import { resolveClientReviewView } from "@/lib/job-control/review-room-view";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { PROMO_INTAKE_PLATE_OPTIONS } from "@/lib/studio-design-renderer";
import { authorizeGeneralDesignReviewProof } from "./authorize";
import { collectGeneralDesignReviewContract } from "./collect";
import {
  customerFacingReviewTextLeaks,
  customerFormatLabelForMember,
  customerProofFilename,
} from "./customer-facing";
import type { GeneralDesignReviewArtifactContract } from "./types";
import {
  buildClearedCustomerLogoMaterial,
  stageGenericCustomerLogoPng,
} from "@/lib/studio-dispatch/cleared-customer-logo";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";

const REPO = path.resolve(__dirname, "../../..");
const CAMPAIGNS_DIR = path.join(REPO, "data", "campaigns");
const TASKS_DIR = path.join(REPO, "data", "campaign-tasks");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");
const PNG = SYNTHETIC_PNG_1X1_BYTES;
const PNG_HASH = createHash("sha256").update(PNG).digest("hex");
const SQUARE_PLATE = PROMO_INTAKE_PLATE_OPTIONS[0];
const PORTRAIT_PLATE = PROMO_INTAKE_PLATE_OPTIONS[1];

function leakScan(...parts: string[]): string | null {
  return customerFacingReviewTextLeaks(parts.join(" "));
}

function baseContract(
  overrides: Partial<GeneralDesignReviewArtifactContract> & {
    members?: GeneralDesignReviewArtifactContract["members"];
  },
): GeneralDesignReviewArtifactContract {
  return {
    packageId: studioGeneralDesignReviewBindV1.packageId,
    campaignId: "pkgd-unit",
    jobId: "pkgd-unit:v2-rtu-menu",
    skuId: "v2-rtu-menu",
    serviceName: "Make Me a Menu",
    renderVersion: 1,
    workVersionId: "v2-rtu-menu-v1",
    members: [
      {
        memberId: "menu",
        customerFormatLabel: customerFormatLabelForMember("menu"),
        mimeType: "image/png",
        widthPx: 1024,
        heightPx: 1536,
        pngRelativePath: "data/campaign-design-artifacts/pkgd-unit/menu.png",
        pngContentSha256: PNG_HASH,
        requiredForSet: true,
      },
    ],
    requiredMemberCount: 1,
    setStatus: "individual_ready",
    observerOk: true,
    ...overrides,
  };
}

function envelopeWithQa(input: {
  skuId: string;
  hashes: readonly string[];
  action?: "qa_pass" | "qa_fail";
}): ServerTasksEnvelope {
  const now = new Date().toISOString();
  const jobId = `pkgd-unit:${input.skuId}`;
  return {
    campaignId: "pkgd-unit",
    tasks: [
      {
        id: `${input.skuId}:qa`,
        title: "QA",
        phase: "qa",
        status: "complete",
        relatedServiceIds: [input.skuId as never],
        familyId: "marketing_assets",
        catalogFamilyId: "marketing_assets",
        serviceName: input.skuId,
        dependsOn: [],
        workflowState: "complete",
      },
    ],
    planFingerprint: "pkgd",
    updatedAt: now,
    version: 10,
    syncedAt: now,
    jobRecords: [
      {
        jobId,
        campaignId: "pkgd-unit",
        skuId: input.skuId,
        serviceName: input.skuId,
        spineStatus: "building_concepts",
        productionLane: "standard",
        intakeComplete: true,
        updatedAt: now,
      } as PurchasedJobRecord,
    ],
    qaRecords: [
      {
        id: "qa-pkgd",
        campaignId: "pkgd-unit",
        taskId: `${input.skuId}:qa`,
        action: input.action ?? "qa_pass",
        createdAt: now,
        actorRole: "qa",
        workVersionId: `${input.skuId}-v1`,
        artifactBinding: {
          workVersionId: `${input.skuId}-v1`,
          artifactIds: [`${input.skuId}-v1`],
          contentSha256s: [...input.hashes],
        },
      },
    ],
  } as ServerTasksEnvelope;
}

describe("STUDIO-OPERATING-GENERAL-DESIGN-REVIEW-BIND-1 unit", () => {
  const staged: string[] = [];

  afterEach(() => {
    for (const rel of staged.splice(0)) {
      rmSync(path.join(REPO, path.dirname(rel)), { recursive: true, force: true });
    }
  });

  it("customer-facing labels and filenames do not leak cert/fixture names", () => {
    expect(customerFormatLabelForMember("square")).toBe("Square graphic");
    expect(customerFormatLabelForMember("portrait")).toBe("Portrait graphic");
    expect(customerProofFilename({ formatLabel: "Square graphic", renderVersion: 2 })).toBe(
      "square-graphic-version-2.png",
    );
    expect(leakScan(customerFormatLabelForMember("square"), "square-graphic-version-1.png")).toBeNull();
    expect(leakScan("cert-square-1024.png")).not.toBeNull();
    expect(leakScan("Harbor & Oak")).not.toBeNull();
  });

  it("fails closed for HOLD SKU, missing file, wrong hash, partial set, and no QA", () => {
    const rel = "data/campaign-design-artifacts/pkgd-unit/menu.png";
    mkdirSync(path.join(REPO, "data/campaign-design-artifacts/pkgd-unit"), { recursive: true });
    writeFileSync(path.join(REPO, rel), PNG);
    staged.push(rel);

    const hold = authorizeGeneralDesignReviewProof({
      contract: baseContract({ skuId: "v2-rtu-handout", setStatus: "not_reviewable" }),
      envelope: envelopeWithQa({ skuId: "v2-rtu-handout", hashes: [PNG_HASH] }),
    });
    expect(hold.ok).toBe(false);
    if (!hold.ok) expect(hold.block).toBe("hold_sku");

    const missing = authorizeGeneralDesignReviewProof({
      contract: baseContract({
        members: [
          {
            ...baseContract().members[0]!,
            pngRelativePath: "data/campaign-design-artifacts/pkgd-unit/missing.png",
          },
        ],
      }),
      envelope: envelopeWithQa({ skuId: "v2-rtu-menu", hashes: [PNG_HASH] }),
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.block).toBe("missing_artifact");

    const wrongHash = authorizeGeneralDesignReviewProof({
      contract: baseContract({
        members: [{ ...baseContract().members[0]!, pngContentSha256: "deadbeef".repeat(8) }],
      }),
      envelope: envelopeWithQa({ skuId: "v2-rtu-menu", hashes: ["deadbeef".repeat(8)] }),
    });
    expect(wrongHash.ok).toBe(false);
    if (!wrongHash.ok) expect(wrongHash.block).toBe("corrupt_artifact");

    const partial = authorizeGeneralDesignReviewProof({
      contract: baseContract({
        skuId: "v2-rtu-promotion-graphics",
        requiredMemberCount: 2,
        setStatus: "partial_set",
        members: [baseContract().members[0]!],
      }),
      envelope: envelopeWithQa({ skuId: "v2-rtu-promotion-graphics", hashes: [PNG_HASH] }),
    });
    expect(partial.ok).toBe(false);
    if (!partial.ok) expect(partial.block).toBe("partial_required_set");

    const noQa = authorizeGeneralDesignReviewProof({
      contract: baseContract(),
      envelope: envelopeWithQa({
        skuId: "v2-rtu-menu",
        hashes: [PNG_HASH],
        action: "qa_fail",
      }),
    });
    expect(noQa.ok).toBe(false);
    if (!noQa.ok) expect(noQa.block).toBe("qa_does_not_authorize");
  });

  it("Review Room view shows general-design proofs and omits cert-named files", () => {
    const now = new Date().toISOString();
    const job: PurchasedJobRecord = {
      jobId: "pkgd-view:v2-rtu-menu",
      campaignId: "pkgd-view",
      skuId: "v2-rtu-menu",
      serviceName: "Make Me a Menu",
      spineStatus: "ready_for_review",
      productionLane: "standard",
      intakeComplete: true,
      updatedAt: now,
      internalQaReviewAuthorization: {
        status: "ELIGIBLE_FOR_REVIEW",
        decisionId: "re-pkgd",
        packageId: studioGeneralDesignReviewBindV1.packageId,
        skuId: "v2-rtu-menu",
        qaRecordIds: ["qa-1"],
        workVersionId: "v2-rtu-menu-v1",
        contentSha256s: [PNG_HASH],
        artifactIds: ["v2-rtu-menu-v1"],
        authorizedAt: now,
      },
      deliverablePrep: [
        {
          deliverableKey: "gd-review:menu",
          label: "Menu design",
          preparedAt: now,
        },
      ],
      fileRegistry: [
        {
          id: "proof:menu",
          clientId: "client-pkgd",
          campaignId: "pkgd-view",
          jobId: "pkgd-view:v2-rtu-menu",
          category: "review_proof",
          filename: "menu-design-version-1.png",
          fileType: "image/png",
          storageRef: {
            provider: "supabase_storage",
            connectionStatus: "private_object",
            bucket: "studio-files-local",
            objectPath: "clients/x/campaigns/pkgd-view/jobs/j/review_proof/v1/menu.png",
            visibilityState: "review-proof",
            originalFilename: "menu-design-version-1.png",
            contentType: "image/png",
            checksumSha256: PNG_HASH,
          },
          visibility: "client_visible",
          versionLabel: "Version 1",
          status: "approved_for_review",
          addedBy: { role: "system", displayName: "Studio Machine" },
          addedAt: now,
          deliverableKey: "gd-review:menu",
          deliverableLabel: "Menu design",
        },
        {
          id: "proof:leak",
          clientId: "client-pkgd",
          campaignId: "pkgd-view",
          jobId: "pkgd-view:v2-rtu-menu",
          category: "review_proof",
          filename: "cert-square-1024.png",
          fileType: "image/png",
          storageRef: {
            provider: "supabase_storage",
            connectionStatus: "private_object",
            bucket: "studio-files-local",
            objectPath: "clients/x/campaigns/pkgd-view/jobs/j/review_proof/v1/leak.png",
            visibilityState: "review-proof",
            originalFilename: "cert-square-1024.png",
            contentType: "image/png",
            checksumSha256: PNG_HASH,
          },
          visibility: "client_visible",
          versionLabel: "Version 1",
          status: "approved_for_review",
          addedBy: { role: "system", displayName: "Studio Machine" },
          addedAt: now,
          deliverableKey: "gd-review:square",
          deliverableLabel: "cert-square-1024",
        },
      ],
    };
    const campaign = {
      campaignId: "pkgd-view",
      campaignName: "River Reed Pottery",
      campaignStatus: "READY_FOR_REVIEW",
      campaignDescription: "",
      estimatedCompletion: "Soon",
      packageId: "custom-studio-plan",
      packageLabel: "Custom",
      paymentReceivedAt: now,
      revisionRoundsUsed: 0,
      createdAt: now,
      updatedAt: now,
      approvedStudioPlan: {
        selectedServiceIds: ["v2-rtu-menu"],
        includedServiceIds: ["v2-rtu-menu"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 8900,
        monthlyTotalCents: 0,
        amountDueTodayCents: 8900,
        lineItems: buildServiceScopeSnapshot(["v2-rtu-menu"]),
        approvedAt: now,
      },
    } as CampaignRecord;
    const view = resolveClientReviewView({
      campaign,
      job,
      envelope: {
        campaignId: "pkgd-view",
        tasks: [],
        planFingerprint: "pkgd",
        updatedAt: now,
        version: 10,
        syncedAt: now,
        jobRecords: [job],
        jobActivityEvents: [],
        jobReviewFeedback: [],
      },
    });
    expect(view?.deliverables.map((entry) => entry.label)).toEqual(["Menu design"]);
    expect(view?.deliverables[0]?.proofFiles[0]?.filename).toBe("menu-design-version-1.png");
    expect(view?.deliverables[0]?.proofFiles[0]?.accessHref).toMatch(/\/proof$/);
    expect(leakScan(...(view?.deliverables.flatMap((entry) => [entry.label, ...entry.proofFiles.map((file) => file.filename)]) ?? []))).toBeNull();
  });
});

function paidCampaign(
  campaignId: string,
  skuId: string,
  campaignName: string,
  answers: Record<string, string>,
): CampaignRecord {
  const now = new Date().toISOString();
  const skus = [skuId] as const;
  const totals = computePlanPricingTotals([...skus]);
  return {
    campaignId,
    campaignName,
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Package D general design Review bind",
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
      checkoutSessionId: `cs_pkgd_${campaignId}`,
      paymentIntentId: `pi_pkgd_${campaignId}`,
      stripeEventId: `evt_pkgd_${campaignId}`,
      selectedServiceIds: [...skus],
      decisionId: `dec_${campaignId}`,
      factFingerprint: `fp_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
    },
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [...skus],
      includedServiceIds: [...skus],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: buildServiceScopeSnapshot([...skus]),
      approvedAt: now,
    },
    projectDetailsSubmittedAt: now,
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: { submittedAt: now, answers },
  };
}

async function seedClearedLogo(campaignId: string, skuId: string): Promise<void> {
  const now = new Date().toISOString();
  const staged = stageGenericCustomerLogoPng({ repoRoot: REPO, campaignId });
  const item = buildClearedCustomerLogoMaterial({
    campaignId,
    skuId,
    stagedRelativePath: staged,
  });
  await writeMaterialsEnvelope({
    campaignId,
    items: [item],
    updatedAt: now,
    syncedAt: now,
    version: 1,
  });
}

async function cleanup(campaignId: string): Promise<void> {
  await Promise.all([
    fs.unlink(path.join(CAMPAIGNS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(TASKS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(MATERIALS_DIR, `${campaignId}.json`)).catch(() => undefined),
  ]);
  rmSync(path.join(REPO, "data", "campaign-design-artifacts", campaignId), {
    recursive: true,
    force: true,
  });
}

describe("STUDIO-OPERATING-GENERAL-DESIGN-REVIEW-BIND-1 paid Machine", () => {
  const ids: string[] = [];
  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanup(id)));
  });

  it(
    "menu: paid Machine production becomes a customer-visible Review proof",
    async () => {
      const campaignId = `pkgd-menu-${Date.now()}`;
      ids.push(campaignId);
      const skuId = "v2-rtu-menu";
      const campaign = paidCampaign(campaignId, skuId, "River Reed Pottery Cafe", {
        [`${skuId}:businessName`]: "River Reed Pottery Cafe",
        [`${skuId}:businessType`]: "Cafe",
        [`${skuId}:dietaryLabels`]: "Contains gluten and dairy. Customer-verified wording.",
        [`${skuId}:disclaimers`]: "Prices may change with clay and kiln schedule.",
        [`${skuId}:materials`]: "Logo on file",
        [`${skuId}:intendedUse`]: "Both print and digital",
        [`${skuId}:sections`]: "Pastries\nDrinks",
        [`${skuId}:items`]:
          "Pastries | Butter Croissant | Flaky layers. | $3.75\nDrinks | Drip Coffee | House brew. | $2.75",
      });
      await upsertCampaignRecord(campaign);
      await seedClearedLogo(campaignId, skuId);
      const first = await ensureDispatchExecution(campaign);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const second = await ensureDispatchExecution(first.campaign);
      expect(second.ok).toBe(true);
      const tasks = await readTasksEnvelope(campaignId);
      const job = tasks?.jobRecords?.find((entry) => entry.skuId === skuId);
      expect(canClientAccessJobReview(job!)).toBe(true);
      const proofs = (job?.fileRegistry ?? []).filter((ref) => ref.category === "review_proof");
      expect(proofs.length).toBe(1);
      expect(second.campaign.revisionRoundsUsed ?? 0).toBe(0);
      const view = resolveClientReviewView({
        campaign: second.ok ? second.campaign : campaign,
        job: job!,
        envelope: tasks!,
      });
      expect(view?.deliverables).toHaveLength(1);
      expect(view?.deliverables[0]?.label).toBe("Menu design");
      expect(view?.deliverables[0]?.proofFiles[0]?.accessHref).toBeTruthy();
      expect(leakScan(view?.deliverables[0]?.label ?? "", view?.deliverables[0]?.proofFiles[0]?.filename ?? "")).toBeNull();
      expect(collectGeneralDesignReviewContract({
        campaignId,
        jobId: job!.jobId,
        skuId,
        result: first.designRendererObserver!.results.find((row) => row.skuId === skuId)!,
      }).setStatus).toBe("individual_ready");
    },
    180_000,
  );

  it(
    "promo Square + Portrait: complete set is visible; one PNG cannot bless the set",
    async () => {
      const campaignId = `pkgd-promo-${Date.now()}`;
      ids.push(campaignId);
      const skuId = "v2-rtu-promotion-graphics";
      const campaign = paidCampaign(campaignId, skuId, "River Reed Pottery", {
        [`${skuId}:campaignFocus`]: "Open Studio Saturday — wheel-throwing seats.",
        [`${skuId}:mustInclude`]:
          "Open Studio Saturday $35. April 12 – April 20, 2026. Call (804) 555-0177 · riverandreed.example/open-studio",
        [`${skuId}:dates`]: "April 12 – April 20, 2026",
        [`${skuId}:callToAction`]:
          "Call (804) 555-0177 or visit riverandreed.example/open-studio",
        [`${skuId}:graphicA_authorizedPurpose`]: "Social",
        [`${skuId}:graphicA_agreedPlate`]: SQUARE_PLATE,
        [`${skuId}:graphicB_authorizedPurpose`]: "Print",
        [`${skuId}:graphicB_agreedPlate`]: PORTRAIT_PLATE,
        [`${skuId}:disclaimers`]: "While seats remain.",
        "shared:materials": "Logo on file",
      });
      await upsertCampaignRecord(campaign);
      await seedClearedLogo(campaignId, skuId);
      const first = await ensureDispatchExecution(campaign);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const tasks = await readTasksEnvelope(campaignId);
      const job = tasks?.jobRecords?.find((entry) => entry.skuId === skuId);
      expect(canClientAccessJobReview(job!)).toBe(true);
      const view = resolveClientReviewView({
        campaign: first.campaign,
        job: job!,
        envelope: tasks!,
      });
      const labels = view?.deliverables.map((entry) => entry.label) ?? [];
      expect(labels).toEqual(expect.arrayContaining(["Square graphic", "Portrait graphic"]));
      expect(view?.deliverables).toHaveLength(2);
      expect(view?.deliverables.every((entry) => entry.proofFiles[0]?.accessHref)).toBe(true);
      const hashes = (job?.fileRegistry ?? [])
        .filter((ref) => ref.category === "review_proof")
        .map((ref) =>
          ref.storageRef.provider === "supabase_storage"
            ? ref.storageRef.checksumSha256
            : undefined,
        );
      expect(new Set(hashes).size).toBe(2);
      expect(leakScan(...labels, ...(view?.deliverables.flatMap((entry) => entry.proofFiles.map((file) => file.filename)) ?? []))).toBeNull();
    },
    240_000,
  );

  it(
    "card: Front and Back are independently presented on the same Version",
    async () => {
      const campaignId = `pkgd-card-${Date.now()}`;
      ids.push(campaignId);
      const skuId = "v2-rtu-business-card";
      const campaign = paidCampaign(campaignId, skuId, "Moss Thread Studio", {
        [`${skuId}:businessName`]: "Moss Thread Studio",
        [`${skuId}:cardNameTitle`]: "Jordan Hale · Studio Owner",
        [`${skuId}:phone`]: "(804) 555-0166",
        [`${skuId}:email`]: "jordan@mossthread.example",
        [`${skuId}:webOrSocial`]: "mossthread.example",
        [`${skuId}:brandMaterials`]: "Logo on file",
      });
      await upsertCampaignRecord(campaign);
      await seedClearedLogo(campaignId, skuId);
      const first = await ensureDispatchExecution(campaign);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const tasks = await readTasksEnvelope(campaignId);
      const job = tasks?.jobRecords?.find((entry) => entry.skuId === skuId);
      expect(canClientAccessJobReview(job!)).toBe(true);
      const view = resolveClientReviewView({
        campaign: first.campaign,
        job: job!,
        envelope: tasks!,
      });
      expect(view?.deliverables.map((entry) => entry.label).sort()).toEqual(["Back", "Front"]);
      expect(first.campaign.revisionRoundsUsed ?? 0).toBe(0);
    },
    180_000,
  );

  it(
    "service-sheet: paid Machine production becomes a customer-visible Review proof",
    async () => {
      const campaignId = `pkgd-sheet-${Date.now()}`;
      ids.push(campaignId);
      const skuId = "v2-rtu-service-sheet";
      const campaign = paidCampaign(campaignId, skuId, "Lumen Bicycle Co", {
        [`${skuId}:businessName`]: "Lumen Bicycle Co",
        [`${skuId}:businessType`]: "Bike shop",
        [`${skuId}:contactDetails`]: "Call (804) 555-0133 · lumenbike.example",
        [`${skuId}:wording`]: "Starting prices shown where listed.",
        [`${skuId}:materials`]: "Logo on file",
        [`${skuId}:services`]:
          "Tune | Seasonal check. | listed | $89\nWheel True | Spoke work. | listed | $45",
      });
      await upsertCampaignRecord(campaign);
      await seedClearedLogo(campaignId, skuId);
      const first = await ensureDispatchExecution(campaign);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const tasks = await readTasksEnvelope(campaignId);
      const job = tasks?.jobRecords?.find((entry) => entry.skuId === skuId);
      expect(canClientAccessJobReview(job!)).toBe(true);
      const view = resolveClientReviewView({
        campaign: first.campaign,
        job: job!,
        envelope: tasks!,
      });
      expect(view?.deliverables).toHaveLength(1);
      expect(view?.deliverables[0]?.label).toBe("Service sheet");
      expect(view?.deliverables[0]?.proofFiles[0]?.accessHref).toBeTruthy();
    },
    180_000,
  );

  it(
    "social-posts: four square proofs are independently visible",
    async () => {
      const campaignId = `pkgd-social-${Date.now()}`;
      ids.push(campaignId);
      const skuId = "v2-rtu-social-posts";
      const campaign = paidCampaign(campaignId, skuId, "River Reed Pottery", {
        [`${skuId}:socialPostsPurposeChoice`]: "Promote an offer",
        [`${skuId}:socialPostsActionChoice`]: "Book now",
        [`${skuId}:socialPostsPlatformChoice`]: "Instagram Post",
        [`${skuId}:postsAbout`]:
          "Promote an offer — Open Studio Saturday $35. April 12 – April 20, 2026.",
        [`${skuId}:callToAction`]:
          "Book now — (804) 555-0177 · riverandreed.example/open-studio",
        [`${skuId}:platform`]: "Instagram Post — Square or portrait feed graphic",
        [`${skuId}:wordingHashtags`]: "No required wording.",
        "shared:materials": "Logo on file",
      });
      await upsertCampaignRecord(campaign);
      await seedClearedLogo(campaignId, skuId);
      const first = await ensureDispatchExecution(campaign);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const tasks = await readTasksEnvelope(campaignId);
      const job = tasks?.jobRecords?.find((entry) => entry.skuId === skuId);
      expect(canClientAccessJobReview(job!)).toBe(true);
      const view = resolveClientReviewView({
        campaign: first.campaign,
        job: job!,
        envelope: tasks!,
      });
      expect(view?.deliverables.map((entry) => entry.label)).toEqual([
        "Post 1",
        "Post 2",
        "Post 3",
        "Post 4",
      ]);
      expect(view?.deliverables.every((entry) => entry.proofFiles[0]?.accessHref)).toBe(true);
    },
    240_000,
  );
});
