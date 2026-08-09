import { existsSync, readFileSync } from "fs";
import path from "path";

import { describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { applyQaFail, applyQaPass } from "@/lib/campaign-tasks/actions";
import { requiredChecksForPhase } from "@/lib/campaign-tasks/qa-checklists";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import {
  ownerEscalationForRoutineOperationalEvent,
  projectKitchenCommsLedger,
} from "@/lib/studio-kitchen-comms";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production";
import {
  evaluateDesignQuality,
  gateDesignQualityForQaPass,
  requiresDesignQualityGate,
} from "@/lib/studio-kitchen-production/design-quality";

import {
  FAIL_JUDGMENT_NOTES_FLYER_A,
  FAIL_JUDGMENT_NOTES_OFF_INDUSTRY,
  briefForSku,
  businessCardAPriorDefect,
  businessCardMetadataLie,
  flyerAFailArtifact,
  flyerAPriorIdentityDrift,
  passAttestations,
  promotionPackPriorDefects,
  serviceSheetAPriorIdentityDrift,
  socialPostsAPriorDefects,
  submissionForSku,
} from "./artifact-registry";
import { sha256FileRelative } from "@/lib/studio-kitchen-production/design-quality";
import {
  CERT_DESIGN_FIXTURE_LABEL,
  CERT_DESIGN_PACKAGE_ID,
  CERT_DESIGN_TESTED_SKUS,
  designFixtureA,
  designFixtureB,
} from "./fixtures";
import { harborOakIdentityLock, saltCedarIdentityLock } from "./identity-locks";

vi.mock("@/lib/draft-intake", () => ({
  readLastDraftIntake: () => null,
}));

const now = "2026-08-09T16:00:00.000Z";
const repoRoot = process.cwd();

const qaStaff: StudioUser = {
  id: "staff-design-qa",
  email: "design-qa@local.dev",
  displayName: "Design QA",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "staff-design-qa": ["cert-design-1"] },
  staffCapabilities: { "staff-design-qa": ["qa"] },
};

const campaign: CampaignRecord = {
  campaignId: "cert-design-1",
  campaignName: CERT_DESIGN_FIXTURE_LABEL,
  campaignStatus: "BUILDING_CONCEPTS",
  campaignDescription: "CERTIFICATION FIXTURE / INTERNAL TEST",
  estimatedCompletion: "Soon",
  packageId: "custom-studio-plan",
  packageLabel: "Custom Studio Plan",
  approvedStudioPlan: {
    selectedServiceIds: ["v2-rtu-flyer"],
    includedServiceIds: ["v2-rtu-flyer"],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: 6900,
    monthlyTotalCents: 0,
    amountDueTodayCents: 6900,
    lineItems: [
      {
        skuId: "v2-rtu-flyer",
        serviceName: "Make Me a Flyer",
        billingType: "one_time",
        exactPriceCents: 6900,
        priceDisplay: "$69",
        deliverables: [],
        exclusions: [],
        timingWindowLabel: "quick",
        revisionRule: "One revision round",
        clientResponsibilities: [],
        executionResponsibility: "studio",
      },
    ],
    approvedAt: now,
  },
  projectDetailsSubmittedAt: now,
  paymentReceivedAt: now,
  selectedCampaignOption: "Option A",
  createdAt: now,
  updatedAt: now,
};

function designTask(skuId: string, familyId: "marketing_assets" | "social"): CampaignTaskItem {
  return {
    id: `${skuId}:creative`,
    title: `${skuId} — Creative`,
    phase: "creative",
    status: "ready_for_qa",
    relatedServiceIds: [skuId],
    familyId,
    catalogFamilyId: familyId === "social" ? "social_media" : "marketing_assets",
    serviceName: skuId,
    dependsOn: [],
    workflowState: "ready_for_qa",
    responsibleRole: "creative_production",
  };
}

function envelope(tasks: CampaignTaskItem[]): ServerTasksEnvelope {
  return {
    campaignId: campaign.campaignId,
    tasks,
    planFingerprint: "cert-design-fp",
    planVersion: 1,
    updatedAt: now,
    version: 12,
    handoffs: [],
    qaRecords: [],
    syncedAt: now,
  };
}

describe("KITCHEN-PRODUCTION-CERT-DESIGN-1", () => {
  it("labels fixtures as internal certification only", () => {
    expect(designFixtureA.label).toBe(CERT_DESIGN_FIXTURE_LABEL);
    expect(designFixtureB.label).toBe(CERT_DESIGN_FIXTURE_LABEL);
    expect(designFixtureA.packageId).toBe(CERT_DESIGN_PACKAGE_ID);
    expect(designFixtureA.whyDifferentFromB.length).toBeGreaterThan(20);
    expect(designFixtureB.whyDifferentFromA.length).toBeGreaterThan(20);
  });

  it("resolves contracts for tested design SKUs only and does not certify by inference", () => {
    for (const sku of CERT_DESIGN_TESTED_SKUS) {
      const result = resolveServiceProductionContract(sku);
      expect(result.status).toBe("resolved");
      if (result.status !== "resolved") continue;
      expect(result.contract.readiness).toBe("contract_ready");
      expect(result.contract.producerRole).toBe("creative_production");
    }
    const untested = resolveServiceProductionContract("bf-001");
    expect(untested.status).toBe("resolved");
    // bf-001 is active but NOT in this design cert tested set
    expect(CERT_DESIGN_TESTED_SKUS.includes("bf-001" as never)).toBe(false);
  });

  it("preserves actual visual artifact files on disk for review", () => {
    const paths = [
      flyerAFailArtifact.relativePath,
      ...submissionForSku("v2-rtu-flyer", "final").artifacts.map((a) => a.relativePath),
      ...submissionForSku("v2-rtu-menu", "final").artifacts.map((a) => a.relativePath),
      ...submissionForSku("v2-rtu-social-posts", "final").artifacts.map((a) => a.relativePath),
      ...submissionForSku("ma-001", "final").artifacts.map((a) => a.relativePath),
    ];
    for (const rel of paths) {
      expect(existsSync(path.join(repoRoot, rel)), rel).toBe(true);
    }
  });

  it("keeps declared artifact dimensions honest to measured PNG headers", () => {
    const artifacts = [
      flyerAFailArtifact,
      ...submissionForSku("v2-rtu-flyer", "final").artifacts,
      ...submissionForSku("v2-rtu-business-card", "final").artifacts,
      ...submissionForSku("v2-rtu-social-posts", "final").artifacts,
      ...submissionForSku("v2-rtu-menu", "final").artifacts,
    ];
    for (const a of artifacts) {
      const buf = readFileSync(path.join(repoRoot, a.relativePath));
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      expect(a.widthPx, a.id).toBe(w);
      expect(a.heightPx, a.id).toBe(h);
    }
  });

  it("fails defective flyer v1 through design-quality evaluator", () => {
    const evaluation = evaluateDesignQuality({
      brief: briefForSku("v2-rtu-flyer", "a"),
      submission: submissionForSku("v2-rtu-flyer", "fail"),
    });
    expect(evaluation.ok).toBe(false);
    const msg = evaluation.findings.map((f) => f.message).join(" | ");
    expect(msg).toMatch(/Best in Richmond|#1|energy|same-day|CTA|required|189|March/i);
  });

  it("rejects checklist-only qa_pass for design-family creative tasks", () => {
    const result = applyQaPass(
      envelope([designTask("v2-rtu-flyer", "marketing_assets")]),
      {
        action: "qa_pass",
        taskId: "v2-rtu-flyer:creative",
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("creative")],
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/designQuality|Checklist attestation alone/i);
  });

  it("rejects qa_pass for flyer fail artifacts then passes corrected final with evidence", () => {
    const task = designTask("v2-rtu-flyer", "marketing_assets");
    const failPass = applyQaPass(
      envelope([task]),
      {
        action: "qa_pass",
        taskId: task.id,
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("creative")],
        designQuality: {
          brief: briefForSku("v2-rtu-flyer", "a"),
          submission: submissionForSku("v2-rtu-flyer", "fail"),
          attestations: {
            ...passAttestations("a"),
            notes: FAIL_JUDGMENT_NOTES_FLYER_A,
            genericnessRejected: false,
          },
        },
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(failPass.ok).toBe(false);

    const failEval = evaluateDesignQuality({
      brief: briefForSku("v2-rtu-flyer", "a"),
      submission: submissionForSku("v2-rtu-flyer", "fail"),
    });
    const fail = applyQaFail(
      envelope([task]),
      {
        action: "qa_fail",
        taskId: task.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
        notes: `${failEval.summary} | ${FAIL_JUDGMENT_NOTES_FLYER_A}`,
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(fail.ok).toBe(true);
    if (!fail.ok) return;
    expect(fail.envelope.tasks[0]?.workflowState).toBe("needs_revision");
    expect(ownerEscalationForRoutineOperationalEvent()).toBe("owner_not_required");

    const ledgerFail = projectKitchenCommsLedger({
      campaignId: campaign.campaignId,
      tasksEnvelope: fail.envelope,
    });
    expect(
      [...ledgerFail.active, ...ledgerFail.history]
        .filter((e) => e.category === "qa")
        .every((e) => e.ownerEscalation === "owner_not_required"),
    ).toBe(true);

    const readyAgain: ServerTasksEnvelope = {
      ...fail.envelope,
      tasks: fail.envelope.tasks.map((t) => ({
        ...t,
        workflowState: "ready_for_qa",
        status: "ready_for_qa",
        claimedByUserId: undefined,
        claimedAt: undefined,
      })),
    };

    const gated = gateDesignQualityForQaPass({
      brief: briefForSku("v2-rtu-flyer", "a"),
      submission: submissionForSku("v2-rtu-flyer", "final"),
      attestations: passAttestations("a"),
    });
    expect(gated.ok).toBe(true);

    const pass = applyQaPass(
      readyAgain,
      {
        action: "qa_pass",
        taskId: task.id,
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("creative")],
        notes: "Corrected Harbor & Oak flyer passes design-quality gate.",
        designQuality: {
          brief: briefForSku("v2-rtu-flyer", "a"),
          submission: submissionForSku("v2-rtu-flyer", "final"),
          attestations: passAttestations("a"),
        },
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(pass.ok).toBe(true);
    if (!pass.ok) return;
    expect(pass.envelope.qaRecords?.find((r) => r.action === "qa_pass")?.designQualityEvidence?.gatePassed).toBe(
      true,
    );
  });

  it("passes remaining tested SKU finals through design-quality gate", () => {
    const cases: Array<{ sku: (typeof CERT_DESIGN_TESTED_SKUS)[number]; fx: "a" | "b" }> = [
      { sku: "v2-rtu-service-sheet", fx: "a" },
      { sku: "v2-rtu-business-card", fx: "a" },
      { sku: "v2-rtu-social-posts", fx: "a" },
      { sku: "v2-rtu-menu", fx: "b" },
      { sku: "v2-rtu-promotion-graphics", fx: "b" },
      { sku: "ma-001", fx: "b" },
    ];
    for (const { sku, fx } of cases) {
      const gated = gateDesignQualityForQaPass({
        brief: briefForSku(sku, fx),
        submission: submissionForSku(sku, "final"),
        attestations: passAttestations(fx),
      });
      expect(gated.ok, sku).toBe(true);
    }
  });

  it("does not gate legacy sm-001 creative path", () => {
    expect(
      requiresDesignQualityGate({
        id: "sm-001:creative",
        title: "Social creative",
        phase: "creative",
        status: "ready_for_qa",
        relatedServiceIds: ["sm-001"],
        familyId: "social",
        catalogFamilyId: "social_media",
        serviceName: "Social",
        dependsOn: [],
        workflowState: "ready_for_qa",
        responsibleRole: "creative_production",
      }),
    ).toBe(false);
  });

  it("fails unauthorized Harbor descriptor and offer mutation across multi-asset social", () => {
    const brief = briefForSku("v2-rtu-social-posts", "a");
    const evaluation = evaluateDesignQuality({
      brief,
      submission: {
        artifacts: [
          ...submissionForSku("v2-rtu-social-posts", "final").artifacts.slice(0, 1),
          socialPostsAPriorDefects[0]!,
          socialPostsAPriorDefects[1]!,
          submissionForSku("v2-rtu-social-posts", "final").artifacts[3]!,
        ],
      },
    });
    expect(evaluation.ok).toBe(false);
    expect(evaluation.multiAssetConsistencyChecked).toBe(true);
    const msg = evaluation.findings.map((f) => f.message).join(" | ");
    expect(msg).toMatch(/Trades|Spring Check|AC Rush|logo variant|offer/i);
  });

  it("fails business card contact semantic mismatch and unapproved logo", () => {
    const evaluation = evaluateDesignQuality({
      brief: briefForSku("v2-rtu-business-card", "a"),
      submission: { artifacts: [businessCardAPriorDefect] },
    });
    expect(evaluation.ok).toBe(false);
    const msg = evaluation.findings.map((f) => f.message).join(" | ");
    expect(msg).toMatch(/email|web|logo|identity/i);
  });

  it("fails expanded Salt bundle inclusions and Bakery & Provisions descriptor", () => {
    const brief = briefForSku("ma-001", "b");
    const good = submissionForSku("ma-001", "final").artifacts;
    const evaluation = evaluateDesignQuality({
      brief,
      submission: {
        artifacts: [
          promotionPackPriorDefects.pack1,
          good[1]!,
          promotionPackPriorDefects.pack3,
          good[3]!,
        ],
      },
    });
    expect(evaluation.ok).toBe(false);
    const msg = evaluation.findings.map((f) => f.message).join(" | ");
    expect(msg).toMatch(/bundle inclusions|Provisions|descriptor/i);
  });

  it("fails off-business home-goods imagery theme for bakery pack asset", () => {
    const evaluation = evaluateDesignQuality({
      brief: briefForSku("ma-001", "b"),
      submission: {
        artifacts: [
          ...submissionForSku("ma-001", "final").artifacts.slice(0, 3),
          promotionPackPriorDefects.pack4,
        ],
      },
    });
    expect(evaluation.ok).toBe(false);
    expect(evaluation.findings.some((f) => /off-business|imagery theme/i.test(f.message))).toBe(
      true,
    );
  });

  it("records imagery business-fit judgment failure without owner escalation", () => {
    const gated = gateDesignQualityForQaPass({
      brief: briefForSku("ma-001", "b"),
      submission: submissionForSku("ma-001", "final"),
      attestations: {
        ...passAttestations("b"),
        imageryBusinessFitReviewed: false,
        notes: FAIL_JUDGMENT_NOTES_OFF_INDUSTRY,
      },
    });
    expect(gated.ok).toBe(false);
    expect(ownerEscalationForRoutineOperationalEvent()).toBe("owner_not_required");
  });

  it("locks approved fixture identity truth for Harbor and Salt", () => {
    expect(harborOakIdentityLock.approvedDescriptors).toContain("Home Services");
    expect(harborOakIdentityLock.prohibitedDescriptors).toContain("Trades");
    expect(harborOakIdentityLock.campaign.offerName).toMatch(/Tune-Up.*Drain Clear/i);
    expect(saltCedarIdentityLock.approvedDescriptors).toContain("Bakery");
    expect(saltCedarIdentityLock.prohibitedDescriptors.join(" ")).toMatch(/Provisions/i);
    expect(saltCedarIdentityLock.campaign.bundleInclusionsExact).toEqual(["coffee", "pastry"]);
  });

  it("binds final Harbor certification artifacts to exact contentSha256 on disk", () => {
    const arts = [
      ...submissionForSku("v2-rtu-business-card", "final").artifacts,
      ...submissionForSku("v2-rtu-social-posts", "final").artifacts,
    ];
    for (const a of arts) {
      expect(a.contentSha256, a.id).toBeTruthy();
      expect(sha256FileRelative(repoRoot, a.relativePath)).toBe(a.contentSha256);
      expect(a.approvedIdentitySourceId).toBe(harborOakIdentityLock.approvedLogoVariantIds[0]);
    }
  });

  it("fails when declared contentSha256 does not match file bytes", () => {
    const card = submissionForSku("v2-rtu-business-card", "final").artifacts[0]!;
    const evaluation = evaluateDesignQuality({
      brief: briefForSku("v2-rtu-business-card", "a"),
      submission: {
        artifacts: [
          {
            ...card,
            contentSha256: "0".repeat(64),
          },
        ],
      },
    });
    expect(evaluation.ok).toBe(false);
    expect(evaluation.findings.some((f) => f.checkKind === "artifact_binding")).toBe(true);
  });

  it("rejects metadata-only approved logo claim without rendered-identity attestation", () => {
    const gated = gateDesignQualityForQaPass({
      brief: briefForSku("v2-rtu-business-card", "a"),
      submission: { artifacts: [businessCardMetadataLie] },
      attestations: {
        ...passAttestations("a"),
        renderedIdentityMatchesDeclaredSource: false,
        notes:
          "Metadata claims approved oval on bound file sha256 but rendered PNG is lighthouse — must fail.",
      },
    });
    expect(gated.ok).toBe(false);
  });

  it("keeps accepted Harbor social #2 and Salt pack finals passing under binding gate", () => {
    expect(
      gateDesignQualityForQaPass({
        brief: briefForSku("v2-rtu-social-posts", "a"),
        submission: submissionForSku("v2-rtu-social-posts", "final"),
        attestations: passAttestations("a"),
      }).ok,
    ).toBe(true);
    expect(
      gateDesignQualityForQaPass({
        brief: briefForSku("ma-001", "b"),
        submission: submissionForSku("ma-001", "final"),
        attestations: passAttestations("b"),
      }).ok,
    ).toBe(true);
  });

  it("documents Saturday availability is not authorized by Harbor fixture truth", () => {
    expect("saturdaySlots" in designFixtureA).toBe(false);
    expect(JSON.stringify(designFixtureA)).not.toMatch(/limited availability|book early/i);
    const social3 = submissionForSku("v2-rtu-social-posts", "final").artifacts.find((a) =>
      a.id.includes("social-a-3"),
    );
    expect(social3?.declaredText).not.toMatch(/Saturday morning|limited availability|book early/i);
  });

  it("fails Harbor flyer/service-sheet when unauthorized identity variant is declared", () => {
    expect(
      evaluateDesignQuality({
        brief: briefForSku("v2-rtu-flyer", "a"),
        submission: { artifacts: [flyerAPriorIdentityDrift] },
      }).ok,
    ).toBe(false);
    expect(
      evaluateDesignQuality({
        brief: briefForSku("v2-rtu-service-sheet", "a"),
        submission: { artifacts: [serviceSheetAPriorIdentityDrift] },
      }).ok,
    ).toBe(false);
  });

  it("binds corrected Harbor flyer and service sheet to locked oval identity", () => {
    for (const sku of ["v2-rtu-flyer", "v2-rtu-service-sheet"] as const) {
      const a = submissionForSku(sku, "final").artifacts[0]!;
      expect(a.approvedIdentitySourceId).toBe(harborOakIdentityLock.approvedLogoVariantIds[0]);
      expect(a.declaredLogoVariantId).toBe(harborOakIdentityLock.approvedLogoVariantIds[0]);
      expect(sha256FileRelative(repoRoot, a.relativePath)).toBe(a.contentSha256);
      expect(
        gateDesignQualityForQaPass({
          brief: briefForSku(sku, "a"),
          submission: submissionForSku(sku, "final"),
          attestations: passAttestations("a"),
        }).ok,
        sku,
      ).toBe(true);
    }
  });

  it("fails unsupported availability/urgency claims even when price/dates/identity are correct", () => {
    const good = submissionForSku("v2-rtu-social-posts", "final").artifacts;
    const urgency = socialPostsAPriorDefects.find((a) =>
      a.id.includes("unauthorized-urgency"),
    )!;
    const evaluation = evaluateDesignQuality({
      brief: briefForSku("v2-rtu-social-posts", "a"),
      submission: {
        artifacts: [good[0]!, urgency, good[2]!, good[3]!],
      },
    });
    expect(evaluation.ok).toBe(false);
    const msg = evaluation.findings.map((f) => f.message).join(" | ");
    expect(msg).toMatch(/Saturday morning|limited availability|book early|offer mutation/i);
    // Price/identity alone must not rescue invented urgency
    expect(urgency.declaredText).toMatch(/\$189/);
    expect(urgency.declaredLogoVariantId).toBe(harborOakIdentityLock.approvedLogoVariantIds[0]);
  });
});
