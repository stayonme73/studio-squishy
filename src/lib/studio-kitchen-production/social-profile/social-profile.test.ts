import { describe, expect, it } from "vitest";

import { resolveServiceProductionContract } from "../resolve-contract";
import {
  assertAccountIdSeparatedFromCredential,
  buildPlatformFieldChecklist,
  copyLimitConflict,
  deriveSkuReadinessFromPlatforms,
  evaluateKitReadiness,
  FACEBOOK_ABOUT_MAX_CHARS,
  getPlatformCapability,
  kitDeliverablesForMode,
  loadAuthoritativeRmJ002Contract,
  loadAuthoritativeRmJ008Contract,
  planPlatformAdapter,
  planSupportedMutations,
  platformHardGateMatrix,
  redactSecretsForLog,
  resolveFulfillment,
  setupVsUpdateBoundary,
  sharedSpineSteps,
  SOCIAL_PROFILE_KIT_READINESS_STATUS,
  SOCIAL_PROFILE_PACKAGE_ID,
  validateSocialProfileWorkPacket,
  verifyReadback,
  type SocialProfileWorkPacket,
} from "./index";

function basePacket(
  overrides: Partial<SocialProfileWorkPacket> = {},
): SocialProfileWorkPacket {
  return {
    workPacketId: "social-packet-1",
    workPacketVersion: "wp-v1",
    campaignId: "camp-social-1",
    skuId: "rm-j002",
    mode: "setup",
    platform: "facebook",
    businessName: "Cedar Lane Studio",
    customerOwnsAccount: true,
    platformAccountId: "page_123",
    authorization: null,
    beforeSnapshot: null,
    mutations: [
      { field: "about", requestedValue: "Portrait sessions downtown." },
      { field: "website", requestedValue: "https://cedar-lane-studio.example" },
    ],
    approvedAbout: "Portrait sessions downtown.",
    approvedWebsite: "https://cedar-lane-studio.example",
    profileImage: {
      relativePath: "docs/example/profile.png",
      contentSha256: "a".repeat(64),
    },
    qaState: "draft",
    label: "CERTIFICATION FIXTURE / INTERNAL",
    ...overrides,
  };
}

describe("KITCHEN-SOCIAL-PROFILE-PRODUCTION-1 A+C kit path", () => {
  it("maps authoritative rm-j002 setup kit contract", () => {
    const c = loadAuthoritativeRmJ002Contract();
    expect(c.skuId).toBe("rm-j002");
    expect(c.mode).toBe("setup");
    expect(c.kitKind).toBe("setup_kit");
    expect(c.serviceName).toBe("Make Me a Social Profile Setup Kit");
    expect(c.directPlatformMutationPromised).toBe(false);
    expect(c.ownerDoesRoutine).toBe("NONE");
    expect(c.exclusions.join(" ")).toMatch(/logging into your account/i);
    expect(c.clientResponsibilities.join(" ")).toMatch(/Apply the delivered kit/i);
    expect(c.clientResponsibilities.join(" ")).not.toMatch(/password/i);
    expect(c.discrepancies).toEqual([]);
  });

  it("maps authoritative rm-j008 update kit contract", () => {
    const c = loadAuthoritativeRmJ008Contract();
    expect(c.skuId).toBe("rm-j008");
    expect(c.kitKind).toBe("update_kit");
    expect(c.serviceName).toBe("Make Me a Social Profile Update Kit");
    expect(c.deliverables.join(" ")).toMatch(/before→after|before->after/i);
    expect(c.directPlatformMutationPromised).toBe(false);
    expect(c.exclusions.join(" ")).toMatch(/logging into your account/i);
  });

  it("uses kit spine Copy → Design → field package → customer delivery", () => {
    expect(sharedSpineSteps()).toContain("copy_production");
    expect(sharedSpineSteps()).toContain("design_production");
    expect(sharedSpineSteps()).toContain("customer_delivery_kit");
    expect(setupVsUpdateBoundary("setup").createsAccount).toBe(false);
  });

  it("allows kit packets without OAuth authorization", () => {
    const ok = validateSocialProfileWorkPacket(basePacket({ authorization: null }));
    expect(ok.ok).toBe(true);
    expect(resolveFulfillment(basePacket())).toBe("kit");
  });

  it("keeps Instagram/TikTok API mutation unsupported while kit recommendations remain", () => {
    const ig = planSupportedMutations("instagram", [
      { field: "bio", requestedValue: "Hello" },
    ]);
    expect(ig.supported).toHaveLength(0);
    expect(ig.customerAppliedRecommendations).toHaveLength(1);
    expect(getPlatformCapability("instagram").verdict).toMatch(/FAIL/i);
    expect(getPlatformCapability("tiktok").verdict).toMatch(/FAIL/i);
  });

  it("covers all kit deliverables for setup and update", () => {
    const setup = evaluateKitReadiness("setup");
    const update = evaluateKitReadiness("update");
    expect(setup.allDeliverablesCovered).toBe(true);
    expect(update.allDeliverablesCovered).toBe(true);
    expect(setup.status).toBe(SOCIAL_PROFILE_KIT_READINESS_STATUS);
    expect(setup.metaOauthStarted).toBe(false);
    expect(setup.facebookFuturePreserved).toBe(true);
    expect(kitDeliverablesForMode("update").some((d) => d.id === "before_after_change_sheet")).toBe(
      true,
    );
  });

  it("builds platform field checklist without silent truncation rules", () => {
    const rows = buildPlatformFieldChecklist({
      platform: "instagram",
      mode: "setup",
      bio: "Calm portraits downtown.",
      website: "https://example.com",
      includeCover: true,
    });
    expect(rows.some((r) => r.field === "Bio")).toBe(true);
    expect(rows.some((r) => /Cover/.test(r.field))).toBe(true);
    const tooLong = "x".repeat(FACEBOOK_ABOUT_MAX_CHARS + 1);
    expect(copyLimitConflict("facebook", "about", tooLong).ok).toBe(false);
  });

  it("requires beforeSnapshot for update QA advancement", () => {
    const update = validateSocialProfileWorkPacket(
      basePacket({
        skuId: "rm-j008",
        mode: "update",
        beforeSnapshot: null,
        qaState: "qa_ready",
      }),
    );
    expect(update.ok).toBe(false);
  });

  it("models read-back for future mutation path without requiring it for kits", () => {
    const result = verifyReadback({
      platform: "facebook",
      expected: { about: "A", website: "https://example.com" },
      actual: {
        capturedAt: new Date().toISOString(),
        source: "platform_readback",
        fields: { about: "A", website: "https://other.example" },
      },
    });
    expect(result.ok).toBe(false);
  });

  it("does not start Meta OAuth or escalate mutation execution", () => {
    const fbPlan = planPlatformAdapter({
      platform: "facebook",
      mode: "setup",
      authorization: {
        credentialHandle: "fb_cred",
        kind: "oauth_page_token",
        platformAccountId: "page_1",
        scopes: ["pages_manage_metadata"],
        revocable: true,
      },
      mutations: [{ field: "about", requestedValue: "Ok" }],
    });
    expect(fbPlan.canExecuteOwnerIndependent).toBe(false);
    const derived = deriveSkuReadinessFromPlatforms();
    expect(derived.metaOauthStarted).toBe(false);
    expect(derived.rmJ002).toBe(SOCIAL_PROFILE_KIT_READINESS_STATUS);
    expect(derived.rmJ008).toBe(SOCIAL_PROFILE_KIT_READINESS_STATUS);
  });

  it("production contracts seal PROFILE KIT readiness without unlimited Customer Ready", () => {
    for (const sku of ["rm-j002", "rm-j008"] as const) {
      const resolved = resolveServiceProductionContract(sku);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") continue;
      expect(resolved.contract.readiness).toBe("contract_ready");
      expect(resolved.contract.readinessNotes).toMatch(
        /CUSTOMER READY WITH LIMITS — PROFILE KIT/i,
      );
      expect(resolved.contract.readinessNotes).not.toMatch(
        /Meta OAuth started|wired Meta/i,
      );
      expect(resolved.contract.primaryTool.toolId).toBe("canva");
    }
  });

  it("preserves platform hard-gate research", () => {
    const matrix = platformHardGateMatrix();
    expect(matrix.facebook).toBe(
      "INTEGRATION READY — ACCOUNT/AUTH BLOCKER",
    );
    expect(matrix.instagram).toMatch(/FAIL/);
    expect(matrix.tiktok).toMatch(/FAIL/);
  });

  it("forbids raw-password storage and redacts secrets", () => {
    const bad = validateSocialProfileWorkPacket(
      basePacket({
        authorization: {
          credentialHandle: "password:secret12345678901234567890",
          kind: "oauth_page_token",
          platformAccountId: "page_123",
          scopes: [],
          revocable: true,
        },
      }),
    );
    expect(bad.ok).toBe(false);
    expect(
      redactSecretsForLog("Bearer EAACwXabc123 access_token=EAACwXabc123"),
    ).not.toMatch(/EAACwXabc123/);
    expect(
      assertAccountIdSeparatedFromCredential("page_123", "cred_handle_abc"),
    ).toBe(true);
    expect(SOCIAL_PROFILE_PACKAGE_ID).toBe("KITCHEN-SOCIAL-PROFILE-PRODUCTION-1");
  });
});
