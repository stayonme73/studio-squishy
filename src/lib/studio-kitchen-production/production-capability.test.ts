import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";

import {
  ACTIVE_CUSTOMER_FACING_SKUS,
  DISCOVERY_GREEN_SKUS,
  EXPLICITLY_EXCLUDED_FROM_CAPABILITY_SET,
  ROUTE_MAP_V1_SHELF_SKUS,
  ROUTE_MAP_V2_RTU_SHELF_SKUS,
  buildProductionCapabilityMatrix,
  contractResolutionCreatesOwnerWork,
  isActiveCustomerFacingSku,
  resolveServiceProductionContract,
  summarizeProductionContractForSku,
} from "./index";

describe("KITCHEN-PRODUCTION-CAPABILITY-1", () => {
  it("locks the active customer-facing set size and membership", () => {
    expect(ACTIVE_CUSTOMER_FACING_SKUS).toHaveLength(
      DISCOVERY_GREEN_SKUS.length +
        ROUTE_MAP_V1_SHELF_SKUS.length +
        ROUTE_MAP_V2_RTU_SHELF_SKUS.length,
    );
    expect(ACTIVE_CUSTOMER_FACING_SKUS).toHaveLength(22);
    for (const sku of ACTIVE_CUSTOMER_FACING_SKUS) {
      expect(isActiveCustomerFacingSku(sku)).toBe(true);
      expect(getServiceById(sku)).toBeDefined();
    }
  });

  it("resolves every active SKU to a production contract with producer, inputs, QA, deliverables", () => {
    for (const sku of ACTIVE_CUSTOMER_FACING_SKUS) {
      const result = resolveServiceProductionContract(sku);
      expect(result.status).toBe("resolved");
      if (result.status !== "resolved") continue;
      const { contract } = result;
      expect(contract.producerRole).toBeTruthy();
      expect(contract.requiredCustomerInputs.length).toBeGreaterThan(0);
      expect(contract.qaItems.length).toBeGreaterThan(0);
      expect(contract.deliverables.length).toBeGreaterThan(0);
      expect(contract.formatExportRequirements.length).toBeGreaterThan(0);
      expect(contract.productionSteps.length).toBeGreaterThan(0);
      expect(contract.revision.withinAllowanceOwnerRequired).toBe(false);
      expect(contract.escalation.contractLookupCreatesOwnerWork).toBe(false);
      expect(contract.revision.revisionRuleAuthority).toBe("catalog_revision_rule");
      expect(contract.revision.revisionRuleText).toBe(
        getServiceById(sku)!.revisionRule,
      );
    }
  });

  it("does not let retired / held SKUs masquerade as launch-ready production", () => {
    const retiredSamples = [
      ...EXPLICITLY_EXCLUDED_FROM_CAPABILITY_SET.retiredRouteMap,
      ...EXPLICITLY_EXCLUDED_FROM_CAPABILITY_SET.heldDraft,
      ...EXPLICITLY_EXCLUDED_FROM_CAPABILITY_SET.retiredBundles.slice(0, 3),
      "v2-addon-post-publish",
    ] as const;

    for (const sku of retiredSamples) {
      const result = resolveServiceProductionContract(sku);
      expect(result.status).not.toBe("resolved");
      if (result.status === "resolved") continue;
      if (result.status === "unknown_sku") {
        // acceptable for truly absent ids
        continue;
      }
      expect(result.status).toBe("not_active_customer_facing");
      expect(result.message).toMatch(/must not masquerade/i);
    }
  });

  it("fails honestly for unknown SKUs", () => {
    const result = resolveServiceProductionContract("not-a-real-sku-xyz");
    expect(result.status).toBe("unknown_sku");
  });

  it("shares family contract logic without losing SKU-specific limits", () => {
    const email = resolveServiceProductionContract("em-001");
    const monthly = resolveServiceProductionContract("em-001-monthly");
    expect(email.status).toBe("resolved");
    expect(monthly.status).toBe("resolved");
    if (email.status !== "resolved" || monthly.status !== "resolved") return;

    expect(email.contract.productionFamilyId).toBe("copy_channels");
    expect(monthly.contract.productionFamilyId).toBe("copy_channels");
    expect(email.contract.producerRole).toBe("copy");
    expect(monthly.contract.producerRole).toBe("copy");
    expect(email.contract.deliverables).not.toEqual(monthly.contract.deliverables);

    const flyer = resolveServiceProductionContract("v2-rtu-flyer");
    const pack = resolveServiceProductionContract("ma-001");
    expect(flyer.status).toBe("resolved");
    expect(pack.status).toBe("resolved");
    if (flyer.status !== "resolved" || pack.status !== "resolved") return;
    expect(flyer.contract.productionFamilyId).toBe("marketing_assets");
    expect(pack.contract.productionFamilyId).toBe("marketing_assets");
    expect(flyer.contract.deliverables).not.toEqual(pack.contract.deliverables);
  });

  it("represents unsupported / integration-required / partial services honestly", () => {
    const voice = resolveServiceProductionContract("ap-001");
    const rtuVoice = resolveServiceProductionContract("v2-rtu-voice");
    const video = resolveServiceProductionContract("v2-rtu-short-video");
    const profile = resolveServiceProductionContract("rm-j002");
    const page = resolveServiceProductionContract("rm-j005");

    expect(voice.status).toBe("resolved");
    expect(rtuVoice.status).toBe("resolved");
    expect(video.status).toBe("resolved");
    expect(profile.status).toBe("resolved");
    expect(page.status).toBe("resolved");
    if (
      voice.status !== "resolved" ||
      rtuVoice.status !== "resolved" ||
      video.status !== "resolved" ||
      profile.status !== "resolved" ||
      page.status !== "resolved"
    ) {
      return;
    }

    // Voice MP3 path is listening-certified (CUSTOMER READY WITH LIMITS — MP3); WAV still unverified.
    expect(voice.contract.readiness).toBe("contract_ready");
    expect(rtuVoice.contract.readiness).toBe("contract_ready");
    expect(voice.contract.readinessNotes).toMatch(/CUSTOMER READY WITH LIMITS — MP3/i);
    expect(voice.contract.readinessNotes).toMatch(/WAV UNVERIFIED/i);
    expect(video.contract.readiness).toBe("contract_ready_integration_required");
    expect(profile.contract.readiness).toBe("partial");
    expect(page.contract.readiness).toBe("partial");
    expect(video.contract.primaryTool.integrationState).toBe("not_integrated");
    expect(voice.contract.primaryTool.integrationState).toBe("partial_adapter");
    expect(voice.contract.primaryTool.note).toMatch(/ElevenLabs/i);
    expect(rtuVoice.contract.primaryTool.integrationState).toBe("partial_adapter");
  });

  it("creates no production records and no owner work on contract lookup", () => {
    const result = resolveServiceProductionContract("sm-001");
    expect(contractResolutionCreatesOwnerWork(result)).toBe(false);
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    expect(result.contract.escalation.contractLookupCreatesOwnerWork).toBe(false);
  });

  it("does not accidentally create Canva/CapCut/Make live integration claims", () => {
    for (const sku of ACTIVE_CUSTOMER_FACING_SKUS) {
      const result = resolveServiceProductionContract(sku);
      if (result.status !== "resolved") continue;
      const tools = [result.contract.primaryTool, ...result.contract.optionalTools];
      for (const tool of tools) {
        expect(tool.integrationState).not.toBe("integrated");
        if (tool.toolId === "canva" || tool.toolId === "capcut") {
          expect(["not_integrated", "manual_operational", "partial_adapter"]).toContain(
            tool.integrationState,
          );
        }
        expect(tool.note.toLowerCase()).not.toMatch(/live api connected|fully integrated webhook/);
      }
    }
  });

  it("builds a capability matrix for every active SKU", () => {
    const matrix = buildProductionCapabilityMatrix();
    expect(matrix).toHaveLength(ACTIVE_CUSTOMER_FACING_SKUS.length);
    for (const row of matrix) {
      expect(row.producerRole).toBeTruthy();
      expect(row.readinessLabel.length).toBeGreaterThan(0);
      expect(row.requiredInputsSummary.length).toBeGreaterThan(0);
      // CONTRACT READY enables production-quality testing only — never customer/launch wording.
      expect(row.readinessLabel.toLowerCase()).not.toMatch(/customer ready|launch ready/);
      expect("canProceedToLiveTesting" in row).toBe(false);
      expect(typeof row.canProceedToProductionQualityTesting).toBe("boolean");
    }
  });

  it("summarizes contracts for Kitchen / work-packet wiring without writes", () => {
    const summary = summarizeProductionContractForSku("cc-001");
    expect(summary).not.toBeNull();
    expect(summary?.producerRole).toBe("copy");
    expect(summary?.readiness).toBe("contract_ready");
    expect(summarizeProductionContractForSku("spark")).toBeNull();
  });

  it("keeps Customer-One protected surfaces out of this package scope", () => {
    // Production capability must not redefine Conversation Room / Gold Master SKUs.
    const green = new Set<string>(DISCOVERY_GREEN_SKUS);
    expect(green.has("rm-j001" as ServiceId)).toBe(false);
    // Capability set is Kitchen production contracts only — 22 shelf/green SKUs.
    expect(ACTIVE_CUSTOMER_FACING_SKUS.includes("spark" as never)).toBe(false);
  });

  it("uses catalog revision authority and does not route within-allowance revisions to owner", () => {
    const result = resolveServiceProductionContract("ma-001");
    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    expect(result.contract.revision.withinAllowanceOwnerRequired).toBe(false);
    expect(result.contract.revision.exhaustedEscalation).toBe("owner_desk_revision_limit");
    expect(result.contract.escalation.ownerHandles.join(" ")).toMatch(/Revision allowance exhausted/i);
    expect(result.contract.escalation.producerHandles.join(" ")).toMatch(/Ordinary revision/i);
  });
});
