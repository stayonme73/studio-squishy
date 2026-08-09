import { existsSync, readFileSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";

import {
  ACTIVE_CUSTOMER_FACING_SKUS,
  EXPLICITLY_EXCLUDED_FROM_CAPABILITY_SET,
  resolveServiceProductionContract,
  VIDEO_PRODUCTION_CHAIN,
} from "../index";

import {
  assertEveryActiveSkuHasDisposition,
  buildFinalActiveSkuLedger,
  closeoutControlPoint,
  deriveCloseoutVerdict,
  FINAL_PRODUCTION_TOOL_LEDGER,
  FINAL_RED_FLAG_REGISTER,
  launchBlockers,
  weakestDisposition,
} from "./index";
import { LAUNCH_DISPOSITIONS } from "./types";

describe("KITCHEN-PRODUCTION-READINESS-CLOSEOUT-1", () => {
  const ledger = buildFinalActiveSkuLedger();

  it("locks active SKU count and full disposition coverage", () => {
    expect(ACTIVE_CUSTOMER_FACING_SKUS).toHaveLength(22);
    expect(ledger).toHaveLength(22);
    expect(assertEveryActiveSkuHasDisposition(ledger)).toBe(true);
    expect(closeoutControlPoint().startingCommit).toMatch(/^2c8b40f/);
  });

  it("requires every active SKU to have production mechanism + launch disposition", () => {
    for (const row of ledger) {
      expect(row.productionMechanismTool.length).toBeGreaterThan(0);
      expect(row.productionMechanismTool).toMatch(/\[.+\]/);
      expect(LAUNCH_DISPOSITIONS).toContain(row.launchDisposition);
      expect(row.readinessStatus.length).toBeGreaterThan(0);
      expect(row.ownerRoutineResponsibility).toBe("NONE");
      expect(row.engineeringIndependence).toBe("NONE");
      expect(row.customerResponsibility.length).toBeGreaterThan(0);
      expect(row.requiredCustomerInputs.length).toBeGreaterThan(0);
      const resolved = resolveServiceProductionContract(row.skuId);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") continue;
      expect(resolved.contract.primaryTool.toolId).not.toBe("none_specified");
      expect(resolved.contract.primaryTool.toolId).not.toBe("capcut");
    }
  });

  it("preserves METHOD COVERED ≠ INDIVIDUALLY CERTIFIED for mapped SKUs", () => {
    const methodCovered = [
      "bf-001",
      "sm-001",
      "sm-001-monthly",
      "em-001-monthly",
      "rm-j007",
    ] as const;
    for (const sku of methodCovered) {
      const row = ledger.find((r) => r.skuId === sku);
      expect(row?.readinessStatus).toBe("CUSTOMER READY WITH LIMITS — METHOD COVERED");
      expect(row?.readinessStatus).not.toMatch(/INDIVIDUALLY CERTIFIED/i);
      expect(row?.certificationEvidencePackage).toMatch(/method/i);
      expect(row?.launchDisposition).toBe("SELL WITH LIMITS");
    }
    // Individually certified design/copy SKUs must not use METHOD COVERED wording.
    const flyer = ledger.find((r) => r.skuId === "v2-rtu-flyer");
    expect(flyer?.readinessStatus).toBe("CUSTOMER READY WITH LIMITS — DESIGN");
    expect(flyer?.readinessStatus).not.toMatch(/METHOD COVERED/);
    const email = ledger.find((r) => r.skuId === "em-001");
    expect(email?.readinessStatus).toBe("CUSTOMER READY WITH LIMITS — COPY");
    expect(email?.readinessStatus).not.toMatch(/METHOD COVERED/);
  });

  it("derives VERDICT A — no launch blockers; all SELL or SELL WITH LIMITS", () => {
    expect(launchBlockers()).toHaveLength(0);
    expect(deriveCloseoutVerdict(ledger)).toBe(
      "KITCHEN PRODUCTION READY FOR LAUNCH WITH DOCUMENTED LIMITS",
    );
    for (const row of ledger) {
      expect(["SELL", "SELL WITH LIMITS"]).toContain(row.launchDisposition);
    }
    expect(
      FINAL_RED_FLAG_REGISTER.some((f) => f.category === "LAUNCH BLOCKER"),
    ).toBe(false);
    expect(
      FINAL_RED_FLAG_REGISTER.some((f) => f.category === "LAUNCH LIMIT"),
    ).toBe(true);
  });

  it("maps retired Studio bundles as out of capability set (weakest-component rule N/A)", () => {
    for (const bundle of EXPLICITLY_EXCLUDED_FROM_CAPABILITY_SET.retiredBundles) {
      const result = resolveServiceProductionContract(bundle);
      expect(result.status).not.toBe("resolved");
    }
    // Monthly twins remain active and inherit method limits — not bundles.
    const monthly = ledger.filter((r) => r.skuId.endsWith("-monthly"));
    expect(monthly).toHaveLength(2);
    expect(weakestDisposition(["SELL", "SELL WITH LIMITS"])).toBe("SELL WITH LIMITS");
    expect(
      weakestDisposition(["SELL WITH LIMITS", "DO NOT SELL"]),
    ).toBe("DO NOT SELL");
  });

  it("rejects CapCut as active production and keeps Shotstack short-video truth", () => {
    const video = resolveServiceProductionContract("v2-rtu-short-video");
    expect(video.status).toBe("resolved");
    if (video.status !== "resolved") return;
    expect(video.contract.primaryTool.toolId).toBe("shotstack");
    expect(video.contract.optionalTools.some((t) => t.toolId === "capcut")).toBe(
      false,
    );
    expect(video.contract.readinessNotes).toMatch(/15–30|A\/V beat sync|beat synchronization/i);
    expect(video.contract.formatExportRequirements.join(" ")).toMatch(/15–30/);
    expect(video.contract.formatExportRequirements.join(" ")).not.toMatch(/45 seconds/);

    const chainText = VIDEO_PRODUCTION_CHAIN.map((s) => s.notes).join(" ");
    expect(chainText).toMatch(/Shotstack/i);
    expect(chainText).not.toMatch(/CapCut is the named assembly tool/i);
    expect(chainText).toMatch(/CapCut remains CLOSED|CapCut export is not an acceptable/i);

    const capcutTool = FINAL_PRODUCTION_TOOL_LEDGER.find((t) => t.tool === "CapCut");
    expect(capcutTool?.status).toMatch(/REJECTED|HISTORICAL|REMOVED/i);
  });

  it("keeps voice MP3 truth and no catalog WAV sell promise", () => {
    for (const sku of ["ap-001", "v2-rtu-voice"] as const) {
      const row = ledger.find((r) => r.skuId === sku);
      expect(row?.readinessStatus).toBe("CUSTOMER READY WITH LIMITS — MP3");
      const resolved = resolveServiceProductionContract(sku);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") continue;
      expect(resolved.contract.readinessNotes).toMatch(/WAV UNVERIFIED/i);
      expect(resolved.contract.deliverables.join(" ")).not.toMatch(/MP3 or WAV/i);
      expect(resolved.contract.deliverables.join(" ")).toMatch(/MP3/i);
    }
    const ap = getServiceById("ap-001");
    expect(ap?.deliverables.join(" ")).toMatch(/MP3/i);
    expect(ap?.deliverables.join(" ")).not.toMatch(/MP3 or WAV/i);
  });

  it("keeps landing-page and social-profile limits honest", () => {
    const landing = ledger.find((r) => r.skuId === "rm-j005");
    expect(landing?.launchDisposition).toBe("SELL WITH LIMITS");
    expect(landing?.readinessLimitations.join(" ")).toMatch(/custom domain/i);
    expect(landing?.readinessLimitations.join(" ")).toMatch(/responsive/i);

    for (const sku of ["rm-j002", "rm-j008"] as const) {
      const row = ledger.find((r) => r.skuId === sku);
      expect(row?.readinessStatus).toBe("CUSTOMER READY WITH LIMITS — PROFILE KIT");
      expect(row?.customerResponsibility).toMatch(/apply/i);
      const resolved = resolveServiceProductionContract(sku);
      expect(resolved.status).toBe("resolved");
      if (resolved.status !== "resolved") continue;
      expect(resolved.contract.readinessNotes).not.toMatch(
        /done-for-you login mutation|admin invite mutation sold/i,
      );
      expect(resolved.contract.limitations.join(" ")).toMatch(/customer applies|Kit delivery only/i);
    }
  });

  it("documents verify-kitchen-credentials disposition without requiring commit", () => {
    const helper = path.resolve(
      process.cwd(),
      "scripts/verify-kitchen-credentials.ts",
    );
    expect(existsSync(helper)).toBe(true);
    const src = readFileSync(helper, "utf8");
    expect(src).toMatch(/auth_only|Auth-only/i);
    expect(src).not.toMatch(/console\.log\(process\.env/);
    expect(src).toMatch(/ELEVENLABS_API_KEY/);
    expect(src).toMatch(/SHOTSTACK/);
    expect(src).toMatch(/NETLIFY_AUTH_TOKEN/);
  });
});
