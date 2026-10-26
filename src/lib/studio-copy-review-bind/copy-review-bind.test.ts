/**
 * STUDIO-OPERATING-COPY-REVIEW-BIND-1
 * Fail-closed copy Review authorization + customer-facing proof presentation.
 */

import { createHash } from "crypto";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";

import type { CampaignRecord } from "@/config/studio-board";
import { studioCopyReviewBindV1 } from "@/config/studio-copy-review-bind-v1";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import { resolveClientReviewView } from "@/lib/job-control/review-room-view";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { assembleCopyFromFacts } from "@/lib/studio-copy-production";
import { authorizeCopyReviewProof } from "./authorize";
import {
  customerFacingCopyReviewTextLeaks,
  copyReviewProofFilename,
  emailMemberLabel,
  renderCustomerCopyProofHtml,
  smsMemberLabel,
} from "./customer-facing";
import type { CopyReviewArtifactContract } from "./types";
import {
  buildClearedCustomerLogoMaterial,
  stageGenericCustomerLogoPng,
} from "@/lib/studio-dispatch/cleared-customer-logo";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";
import { writeMaterialsEnvelope } from "@/lib/materials/store";

const REPO = path.resolve(__dirname, "../../..");
const CAMPAIGNS_DIR = path.join(REPO, "data", "campaigns");
const TASKS_DIR = path.join(REPO, "data", "campaign-tasks");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");

function leakScan(...parts: string[]): string | null {
  return customerFacingCopyReviewTextLeaks(parts.join(" "));
}

function hashSubmission(submission: unknown): string {
  return createHash("sha256").update(JSON.stringify(submission)).digest("hex");
}

function sampleEmails() {
  return [
    {
      subjectOptions: ["Open Studio Saturday"],
      previewText: "Call (804) 555-0177",
      body: "Wheel-throwing seats $35.\n\n",
      cta: "Call (804) 555-0177",
    },
    {
      subjectOptions: ["Reminder: Open Studio Saturday"],
      previewText: "Call (804) 555-0177",
      body: "Wheel-throwing seats $35.\n\nCall (804) 555-0177",
      cta: "Call (804) 555-0177",
    },
  ];
}

function baseContract(
  overrides: Partial<CopyReviewArtifactContract> = {},
): CopyReviewArtifactContract {
  const emails = sampleEmails();
  const submission = { kind: "email_set", emails };
  const copySha256 = hashSubmission(submission);
  return {
    packageId: studioCopyReviewBindV1.packageId,
    campaignId: "pkge-unit",
    jobId: "pkge-unit:v2-rtu-email-kit",
    skuId: "v2-rtu-email-kit",
    serviceName: "Make My Email Campaign Kit",
    renderVersion: 1,
    workVersionId: "v2-rtu-email-kit-v1",
    artifactRelativePath: "data/campaign-design-artifacts/pkge-unit/copy-v1.json",
    copySha256,
    members: emails.map((email, index) => ({
      memberId: `email-${index + 1}`,
      memberKind: "email" as const,
      customerFormatLabel: emailMemberLabel(index + 1),
      subject: email.subjectOptions[0],
      previewText: email.previewText,
      body: email.body,
      cta: email.cta,
      pieceContentSha256: hashSubmission({
        subject: email.subjectOptions[0],
        previewText: email.previewText,
        body: email.body,
        cta: email.cta,
      }),
      requiredForSet: true,
    })),
    requiredMemberCount: 2,
    setStatus: "complete_reviewable_set",
    observerOk: true,
    copyQualityEvidence: {
      evaluation: {
        skuId: "v2-rtu-email-kit",
        ok: true,
        findings: [],
        checkedAt: new Date().toISOString(),
        deterministicFailCount: 0,
        judgmentRequired: true,
        summary: "ok",
      },
      attestations: {
        brandVoiceReviewed: true,
        grammarSpellingReviewed: true,
        notes: "Fact-bound assembler used only customer Intake facts.",
      },
      gatePassed: true,
    },
    ...overrides,
  };
}

function writeArtifact(contract: CopyReviewArtifactContract) {
  const abs = path.join(REPO, contract.artifactRelativePath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    `${JSON.stringify(
      {
        skuId: contract.skuId,
        campaignId: contract.campaignId,
        attempt: contract.renderVersion,
        submission: {
          kind: "email_set",
          emails: contract.members.map((member) => ({
            subjectOptions: [member.subject ?? ""],
            previewText: member.previewText ?? "",
            body: member.body,
            cta: member.cta ?? "",
          })),
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function envelopeWithQa(input: {
  skuId: string;
  hashes: readonly string[];
  action?: "qa_pass" | "qa_fail";
  gatePassed?: boolean;
}): ServerTasksEnvelope {
  const now = new Date().toISOString();
  const jobId = `pkge-unit:${input.skuId}`;
  const gatePassed = input.gatePassed ?? input.action !== "qa_fail";
  return {
    campaignId: "pkge-unit",
    tasks: [
      {
        id: `${input.skuId}:qa`,
        title: "QA",
        phase: "qa",
        status: "complete",
        relatedServiceIds: [input.skuId as never],
        familyId: "copy_channels",
        catalogFamilyId: "email_marketing",
        serviceName: input.skuId,
        dependsOn: [],
        workflowState: "complete",
      },
    ],
    planFingerprint: "pkge",
    updatedAt: now,
    version: 10,
    syncedAt: now,
    jobRecords: [
      {
        jobId,
        campaignId: "pkge-unit",
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
        id: "qa-pkge",
        campaignId: "pkge-unit",
        taskId: `${input.skuId}:qa`,
        action: input.action ?? "qa_pass",
        createdAt: now,
        actorRole: "qa",
        workVersionId: `${input.skuId}-v1`,
        copyQualityEvidence: gatePassed
          ? {
              evaluation: {
                skuId: input.skuId,
                ok: true,
                findings: [],
                checkedAt: now,
                deterministicFailCount: 0,
                judgmentRequired: true,
                summary: "ok",
              },
              attestations: {
                brandVoiceReviewed: true,
                grammarSpellingReviewed: true,
                notes: "Fact-bound assembler used only customer Intake facts.",
              },
              gatePassed: true,
            }
          : undefined,
        artifactBinding: {
          workVersionId: `${input.skuId}-v1`,
          artifactIds: [`${input.skuId}-v1`],
          contentSha256s: [...input.hashes],
        },
      },
    ],
  } as ServerTasksEnvelope;
}

describe("STUDIO-OPERATING-COPY-REVIEW-BIND-1 unit", () => {
  const staged: string[] = [];

  afterEach(() => {
    for (const rel of staged.splice(0)) {
      rmSync(path.join(REPO, path.dirname(rel)), { recursive: true, force: true });
    }
  });

  it("customer-facing labels and filenames do not leak cert/fixture names", () => {
    expect(emailMemberLabel(1)).toBe("Email 1");
    expect(smsMemberLabel(2)).toBe("Text message 2");
    expect(copyReviewProofFilename({ formatLabel: "Email 1", renderVersion: 1 })).toBe(
      "email-1-version-1.html",
    );
    expect(leakScan("Email 1", "email-1-version-1.html")).toBeNull();
    expect(leakScan("copy-v1.json")).not.toBeNull();
    expect(leakScan("sha256:abc")).not.toBeNull();
    expect(leakScan("Harbor & Oak")).not.toBeNull();
    const html = renderCustomerCopyProofHtml(baseContract().members[0]!);
    expect(html).toContain("Subject");
    expect(html).toContain("Open Studio Saturday");
    expect(leakScan(html)).toBeNull();
  });

  it("fails closed for HOLD SKU, missing file, wrong hash, partial set, and no QA", () => {
    const contract = baseContract();
    writeArtifact(contract);
    staged.push(contract.artifactRelativePath);

    const hold = authorizeCopyReviewProof({
      contract: baseContract({ skuId: "cc-001", setStatus: "not_reviewable" }),
      envelope: envelopeWithQa({ skuId: "cc-001", hashes: [contract.copySha256] }),
    });
    expect(hold.ok).toBe(false);
    if (!hold.ok) expect(hold.block).toBe("hold_sku");

    const missing = authorizeCopyReviewProof({
      contract: baseContract({
        artifactRelativePath: "data/campaign-design-artifacts/pkge-unit/missing.json",
      }),
      envelope: envelopeWithQa({ skuId: "v2-rtu-email-kit", hashes: [contract.copySha256] }),
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.block).toBe("missing_artifact");

    const corrupt = authorizeCopyReviewProof({
      contract: baseContract({ copySha256: "deadbeef".repeat(8) }),
      envelope: envelopeWithQa({ skuId: "v2-rtu-email-kit", hashes: ["deadbeef".repeat(8)] }),
    });
    expect(corrupt.ok).toBe(false);
    if (!corrupt.ok) expect(corrupt.block).toBe("corrupt_artifact");

    const partial = authorizeCopyReviewProof({
      contract: baseContract({
        requiredMemberCount: 2,
        setStatus: "partial_set",
        members: [contract.members[0]!],
      }),
      envelope: envelopeWithQa({ skuId: "v2-rtu-email-kit", hashes: [contract.copySha256] }),
    });
    expect(partial.ok).toBe(false);
    if (!partial.ok) expect(partial.block).toBe("partial_required_set");

    const noQa = authorizeCopyReviewProof({
      contract,
      envelope: envelopeWithQa({
        skuId: "v2-rtu-email-kit",
        hashes: [contract.copySha256],
        action: "qa_fail",
        gatePassed: false,
      }),
    });
    expect(noQa.ok).toBe(false);
    if (!noQa.ok) expect(noQa.block).toBe("qa_does_not_authorize");

    const wrongQaHash = authorizeCopyReviewProof({
      contract,
      envelope: envelopeWithQa({
        skuId: "v2-rtu-email-kit",
        hashes: ["ffff".repeat(16)],
      }),
    });
    expect(wrongQaHash.ok).toBe(false);
    if (!wrongQaHash.ok) expect(wrongQaHash.block).toBe("hash_mismatch");

    const stale = authorizeCopyReviewProof({
      contract,
      envelope: envelopeWithQa({ skuId: "v2-rtu-email-kit", hashes: [contract.copySha256] }),
      forceStaleHash: "aaaa".repeat(16),
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.block).toBe("stale_or_superseded");
  });

  it("Review Room view shows copy proofs and omits cert-named files", () => {
    const now = new Date().toISOString();
    const job: PurchasedJobRecord = {
      jobId: "pkge-view:v2-rtu-email-kit",
      campaignId: "pkge-view",
      skuId: "v2-rtu-email-kit",
      serviceName: "Make My Email Campaign Kit",
      spineStatus: "ready_for_review",
      productionLane: "standard",
      intakeComplete: true,
      updatedAt: now,
      internalQaReviewAuthorization: {
        status: "ELIGIBLE_FOR_REVIEW",
        decisionId: "re-pkge",
        packageId: studioCopyReviewBindV1.packageId,
        skuId: "v2-rtu-email-kit",
        qaRecordIds: ["qa-1"],
        workVersionId: "v2-rtu-email-kit-v1",
        contentSha256s: ["abc"],
        artifactIds: ["v2-rtu-email-kit-v1"],
        authorizedAt: now,
      },
      deliverablePrep: [
        {
          deliverableKey: "copy-review:email-1",
          label: "Email 1",
          preparedAt: now,
        },
      ],
      fileRegistry: [
        {
          id: "proof:email-1",
          clientId: "client-pkge",
          campaignId: "pkge-view",
          jobId: "pkge-view:v2-rtu-email-kit",
          category: "review_proof",
          filename: "email-1-version-1.html",
          fileType: "text/html",
          storageRef: {
            provider: "supabase_storage",
            connectionStatus: "private_object",
            bucket: "studio-files-local",
            objectPath: "clients/x/campaigns/pkge-view/jobs/j/review_proof/v1/email.html",
            visibilityState: "review-proof",
            originalFilename: "email-1-version-1.html",
            contentType: "text/html",
            checksumSha256: "aa".repeat(32),
          },
          visibility: "client_visible",
          versionLabel: "Version 1",
          status: "approved_for_review",
          addedBy: { role: "system", displayName: "Studio Machine" },
          addedAt: now,
          deliverableKey: "copy-review:email-1",
          deliverableLabel: "Email 1",
        },
        {
          id: "proof:leak",
          clientId: "client-pkge",
          campaignId: "pkge-view",
          jobId: "pkge-view:v2-rtu-email-kit",
          category: "review_proof",
          filename: "copy-v1.json",
          fileType: "application/json",
          storageRef: {
            provider: "supabase_storage",
            connectionStatus: "private_object",
            bucket: "studio-files-local",
            objectPath: "clients/x/campaigns/pkge-view/jobs/j/review_proof/v1/leak.json",
            visibilityState: "review-proof",
            originalFilename: "copy-v1.json",
            contentType: "application/json",
            checksumSha256: "bb".repeat(32),
          },
          visibility: "client_visible",
          versionLabel: "Version 1",
          status: "approved_for_review",
          addedBy: { role: "system", displayName: "Studio Machine" },
          addedAt: now,
          deliverableKey: "copy-review:email-2",
          deliverableLabel: "copy-v1.json",
        },
      ],
    };
    const campaign = {
      campaignId: "pkge-view",
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
        selectedServiceIds: ["v2-rtu-email-kit"],
        includedServiceIds: ["v2-rtu-email-kit"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 12900,
        monthlyTotalCents: 0,
        amountDueTodayCents: 12900,
        lineItems: buildServiceScopeSnapshot(["v2-rtu-email-kit"]),
        approvedAt: now,
      },
    } as CampaignRecord;
    const view = resolveClientReviewView({
      campaign,
      job,
      envelope: {
        campaignId: "pkge-view",
        tasks: [],
        planFingerprint: "pkge",
        updatedAt: now,
        version: 10,
        syncedAt: now,
        jobRecords: [job],
        jobActivityEvents: [],
        jobReviewFeedback: [],
      },
    });
    expect(view?.deliverables.map((entry) => entry.label)).toEqual(["Email 1"]);
    expect(view?.deliverables[0]?.proofFiles[0]?.filename).toBe("email-1-version-1.html");
    expect(view?.deliverables[0]?.proofFiles[0]?.accessHref).toMatch(/\/proof$/);
    expect(
      leakScan(
        ...(view?.deliverables.flatMap((entry) => [
          entry.label,
          ...entry.proofFiles.map((file) => file.filename),
        ]) ?? []),
      ),
    ).toBeNull();
  });

  it("assembler still fails closed for invented claims and missing consent", () => {
    const invented = assembleCopyFromFacts({
      skuId: "v2-rtu-email-kit",
      businessName: "River Reed Pottery",
      campaignGoal: "Open Studio Saturday",
      mustInclude: "Seats $35 with guaranteed savings",
      callToAction: "Call (804) 555-0177",
      compliance: "",
      mustNotSay: "",
      messageCopy: "",
      sendingAccount: "Mailchimp",
      listConsent: "Yes — I own the list and have consent",
    });
    expect(invented.ok).toBe(true);
    if (!invented.ok) return;
    expect(JSON.stringify(invented.submission)).toMatch(/guaranteed savings/i);

    const consent = assembleCopyFromFacts({
      skuId: "v2-rtu-email-kit",
      businessName: "River Reed Pottery",
      campaignGoal: "Open Studio Saturday",
      mustInclude: "Seats $35",
      callToAction: "Call (804) 555-0177",
      compliance: "",
      mustNotSay: "",
      messageCopy: "",
      sendingAccount: "Mailchimp",
      listConsent: "Not yet — I need to set this up first",
    });
    expect(consent.ok).toBe(false);
    if (consent.ok) return;
    expect(consent.code).toBe("CONSENT_NOT_CONFIRMED");
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
    campaignDescription: "Package E copy Review bind",
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
      checkoutSessionId: `cs_pkge_${campaignId}`,
      paymentIntentId: `pi_pkge_${campaignId}`,
      stripeEventId: `evt_pkge_${campaignId}`,
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
    fileName: "customer-mark.png",
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

describe("STUDIO-OPERATING-COPY-REVIEW-BIND-1 paid Machine", () => {
  const ids: string[] = [];
  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanup(id)));
  });

  it("email-kit: paid Machine copy becomes customer-visible Review proofs", async () => {
    const campaignId = `pkge-email-${Date.now()}`;
    ids.push(campaignId);
    const skuId = "v2-rtu-email-kit";
    const campaign = paidCampaign(campaignId, skuId, "River Reed Pottery", {
      [`${skuId}:campaignGoal`]: "Open Studio Saturday for wheel-throwing seats",
      [`${skuId}:mustInclude`]:
        "Open Studio Saturday — wheel-throwing seats $35. Call (804) 555-0177 or visit riverandreed.example",
      [`${skuId}:callToAction`]: "Call (804) 555-0177 or visit riverandreed.example",
      [`${skuId}:listConsent`]: "Yes — I own the list and have consent",
      [`${skuId}:sendingAccount`]: "Mailchimp",
      [`${skuId}:mustNotSay`]: "guaranteed savings",
      [`${skuId}:materials`]: "No extra files. Brand name and offer are in this form.",
    });
    await upsertCampaignRecord(campaign);
    await seedClearedLogo(campaignId, skuId);
    const first = await ensureDispatchExecution(campaign);
    expect(first.ok, first.ok ? "ok" : `${first.error}: ${first.message}`).toBe(true);
    const copyResult = first.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
      (result) => result.skuId === skuId,
    );
    expect(copyResult?.ok, copyResult?.message ?? copyResult?.failureCode).toBe(true);
    const second = await ensureDispatchExecution(first.campaign);
    const tasks = await readTasksEnvelope(campaignId);
    const job = tasks?.jobRecords?.find((entry) => entry.skuId === skuId);
    expect(canClientAccessJobReview(job!)).toBe(true);
    expect(second.campaign.revisionRoundsUsed ?? 0).toBe(0);
    const view = resolveClientReviewView({
      campaign: second.campaign,
      job: job!,
      envelope: tasks!,
    });
    expect(view?.deliverables.map((entry) => entry.label)).toEqual(["Email 1", "Email 2"]);
    expect(view?.deliverables).toHaveLength(2);
    for (const entry of view?.deliverables ?? []) {
      expect(entry.proofFiles[0]?.accessHref).toMatch(/\/proof$/);
      expect(entry.proofFiles[0]?.fileType).toBe("text/html");
      expect(entry.proofFiles[0]?.versionLabel).toMatch(/^Version /);
    }
    const proofs = (job?.fileRegistry ?? []).filter((ref) => ref.category === "review_proof");
    expect(proofs).toHaveLength(2);
    const third = await ensureDispatchExecution(second.campaign);
    const after = await readTasksEnvelope(campaignId);
    const afterJob = after?.jobRecords?.find((entry) => entry.skuId === skuId);
    expect(
      (afterJob?.fileRegistry ?? []).filter((ref) => ref.category === "review_proof"),
    ).toHaveLength(2);
    expect(third.campaign.revisionRoundsUsed ?? 0).toBe(0);
    const blob = JSON.stringify(view?.deliverables);
    expect(blob).not.toMatch(/copy-v\d+\.json|sha256:|copy-hook-receipt/i);
  });

  it("email-kit: QA failure + Machine correction still binds the passing copy", async () => {
    const campaignId = `pkge-email-correct-${Date.now()}`;
    ids.push(campaignId);
    const skuId = "v2-rtu-email-kit";
    const campaign = paidCampaign(campaignId, skuId, "Moss Thread Studio", {
      [`${skuId}:campaignGoal`]: "A next-level Open Studio Saturday",
      [`${skuId}:mustInclude`]:
        "Open Studio Saturday — wheel-throwing seats $35. Call (804) 555-0177",
      [`${skuId}:callToAction`]: "Call (804) 555-0177",
      [`${skuId}:listConsent`]: "Yes — I own the list and have consent",
      [`${skuId}:sendingAccount`]: "Mailchimp",
      [`${skuId}:mustNotSay`]: "",
      [`${skuId}:materials`]: "No extra files.",
    });
    await upsertCampaignRecord(campaign);
    await seedClearedLogo(campaignId, skuId);
    const first = await ensureDispatchExecution(campaign);
    const copyResult = first.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
      (result) => result.skuId === skuId,
    );
    expect(copyResult?.ok, copyResult?.message ?? copyResult?.failureCode).toBe(true);
    expect(copyResult?.attempts).toBeGreaterThanOrEqual(2);
    const tasks = await readTasksEnvelope(campaignId);
    const job = tasks?.jobRecords?.find((entry) => entry.skuId === skuId);
    expect(canClientAccessJobReview(job!)).toBe(true);
    const view = resolveClientReviewView({
      campaign: first.campaign,
      job: job!,
      envelope: tasks!,
    });
    const labels = view?.deliverables.flatMap((entry) => [
      entry.label,
      ...entry.proofFiles.map((file) => file.filename),
    ]);
    expect(labels?.join(" ")).not.toMatch(/next-level/i);
    expect(view?.deliverables.map((entry) => entry.label)).toEqual(["Email 1", "Email 2"]);
  });

  it("email-kit: unsupported claim does not open Review", async () => {
    const campaignId = `pkge-email-claim-${Date.now()}`;
    ids.push(campaignId);
    const skuId = "v2-rtu-email-kit";
    const campaign = paidCampaign(campaignId, skuId, "River Reed Pottery", {
      [`${skuId}:campaignGoal`]: "Open Studio Saturday",
      [`${skuId}:mustInclude`]: "Wheel-throwing seats $35 with guaranteed savings",
      [`${skuId}:callToAction`]: "Call (804) 555-0177",
      [`${skuId}:listConsent`]: "Yes — I own the list and have consent",
      [`${skuId}:sendingAccount`]: "Mailchimp",
      [`${skuId}:mustNotSay`]: "",
      [`${skuId}:materials`]: "No extra files.",
    });
    await upsertCampaignRecord(campaign);
    await seedClearedLogo(campaignId, skuId);
    const first = await ensureDispatchExecution(campaign);
    const copyResult = first.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
      (result) => result.skuId === skuId,
    );
    expect(copyResult?.ok).toBe(false);
    const tasks = await readTasksEnvelope(campaignId);
    const job = tasks?.jobRecords?.find((entry) => entry.skuId === skuId);
    expect(canClientAccessJobReview(job!)).toBe(false);
  });

  it("sms-kit: paid Machine copy becomes customer-visible Review proofs", async () => {
    const campaignId = `pkge-sms-${Date.now()}`;
    ids.push(campaignId);
    const skuId = "v2-rtu-sms-kit";
    const campaign = paidCampaign(campaignId, skuId, "Lumen Press", {
      [`${skuId}:campaignGoal`]: "Open Studio Saturday reminder",
      [`${skuId}:mustInclude`]: "Seats $35. Call (804) 555-0177",
      [`${skuId}:callToAction`]: "Call (804) 555-0177",
      [`${skuId}:messageCopy`]:
        "Open Studio Saturday — seats $35.\nLast seats for Saturday — reply if you want one.",
      [`${skuId}:listConsent`]: "Yes — I own the list and have consent",
      [`${skuId}:sendingAccount`]: "SimpleTexting",
      [`${skuId}:optOutWording`]: "Reply STOP to opt out.",
      [`${skuId}:mustNotSay`]: "guaranteed savings",
    });
    await upsertCampaignRecord(campaign);
    await seedClearedLogo(campaignId, skuId);
    const first = await ensureDispatchExecution(campaign);
    const copyResult = first.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
      (result) => result.skuId === skuId,
    );
    expect(copyResult?.ok, copyResult?.message ?? copyResult?.failureCode).toBe(true);
    const tasks = await readTasksEnvelope(campaignId);
    const job = tasks?.jobRecords?.find((entry) => entry.skuId === skuId);
    expect(canClientAccessJobReview(job!)).toBe(true);
    const view = resolveClientReviewView({
      campaign: first.campaign,
      job: job!,
      envelope: tasks!,
    });
    expect(view?.deliverables.map((entry) => entry.label)).toEqual([
      "Text message 1",
      "Text message 2",
    ]);
    expect(view?.revisionRoundsUsed ?? 0).toBe(0);
    expect(view?.deliverables[0]?.proofFiles[0]?.accessHref).toMatch(/\/proof$/);
  });
});
