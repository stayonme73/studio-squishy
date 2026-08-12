/**
 * STUDIO-OPERATING-DESIGN-SERVICE-SHEET-PROOF-1
 */

import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";

import { runBusinessCardProofPipeline } from "./card-pipeline";
import { buildHarborOakBusinessCardProjectTruth } from "./card-fixtures";
import { runDesignRendererProofPipeline } from "./pipeline";
import { buildHarborOakFlyerProjectTruth } from "./fixtures";
import { buildSaltCedarMenuProjectTruthMax } from "./menu-fixtures";
import { runMenuProofPipeline } from "./menu-pipeline";
import {
  FIXTURE_CONTACT_FOR_PRICING_LINE,
  SERVICE_SHEET_PROOF_ARTIFACT_ROOT,
  buildHarborOakServiceSheetProjectTruthMax,
  buildMaxLoadServiceSheetRows,
} from "./service-sheet-fixtures";
import { mapServicePriceDisplayMode } from "./service-sheet-map-price";
import { runServiceSheetProofPipeline } from "./service-sheet-pipeline";
import {
  reasonServiceSheetDesignSpecDeterministic,
  assertServiceSheetRequiredTruth,
} from "./service-sheet-reason";
import { verifyServiceSheetCompletenessAndPrices } from "./service-sheet-completeness";
import { declaredTextFromServiceSheetSpec } from "./service-sheet-render-html";
import {
  SERVICE_SHEET_CANVAS,
  SERVICE_SHEET_MAX_SERVICES,
  type ServiceSheetDesignSpec,
  type ServiceSheetProjectTruth,
} from "./service-sheet-types";
import { fingerprintServiceSheetDesignSpec } from "./service-sheet-bind";

const REPO = path.resolve(__dirname, "../../..");

describe("studio-design-renderer service-sheet proof (v2-rtu-service-sheet)", () => {
  it("dispatch primaryTool is studio_design_renderer after service-sheet hook package", () => {
    const resolved = resolveServiceProductionContract("v2-rtu-service-sheet");
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    expect(resolved.contract.primaryTool.toolId).toBe("studio_design_renderer");
  });

  it("max fixture is exactly 10 services with mixed pricing modes", () => {
    const rows = buildMaxLoadServiceSheetRows();
    expect(rows).toHaveLength(SERVICE_SHEET_MAX_SERVICES);
    expect(rows.filter((r) => r.priceMode === "listed").length).toBeGreaterThanOrEqual(3);
    expect(
      rows.filter((r) => r.priceMode === "contact_for_pricing"),
    ).toHaveLength(1);
    expect(rows.filter((r) => r.priceMode === "omitted").length).toBeGreaterThanOrEqual(1);
    const contact = rows.find((r) => r.priceMode === "contact_for_pricing");
    expect(contact?.priceDisplay).toBe(FIXTURE_CONTACT_FOR_PRICING_LINE);
  });

  it("customer-truth mapping: listed / contact_for_pricing / omitted; never invents", () => {
    expect(mapServicePriceDisplayMode({ startingPriceText: "$99" })).toEqual({
      ok: true,
      priceMode: "listed",
      priceDisplay: "$99",
    });
    expect(
      mapServicePriceDisplayMode({
        contactForPricingText: FIXTURE_CONTACT_FOR_PRICING_LINE,
      }),
    ).toEqual({
      ok: true,
      priceMode: "contact_for_pricing",
      priceDisplay: FIXTURE_CONTACT_FOR_PRICING_LINE,
    });
    expect(mapServicePriceDisplayMode({})).toEqual({
      ok: true,
      priceMode: "omitted",
    });
    expect(
      mapServicePriceDisplayMode({
        startingPriceText: "$10",
        contactForPricingText: FIXTURE_CONTACT_FOR_PRICING_LINE,
      }).ok,
    ).toBe(false);
  });

  it("missing service name fails closed", () => {
    const truth = buildHarborOakServiceSheetProjectTruthMax({ repoRoot: REPO });
    const bad: ServiceSheetProjectTruth = {
      ...truth,
      services: truth.services.map((s, i) =>
        i === 0 ? { ...s, name: "" } : s,
      ),
    };
    expect(() => assertServiceSheetRequiredTruth(bad)).toThrow(
      /service name/i,
    );
  });

  it("listed without price text fails closed", () => {
    const truth = buildHarborOakServiceSheetProjectTruthMax({ repoRoot: REPO });
    const bad: ServiceSheetProjectTruth = {
      ...truth,
      services: truth.services.map((s, i) =>
        i === 0
          ? { ...s, priceMode: "listed", priceDisplay: "" }
          : s,
      ),
    };
    expect(() => reasonServiceSheetDesignSpecDeterministic(bad)).toThrow(
      /listed requires customer price text/i,
    );
  });

  it("contact_for_pricing without authorized text fails closed", () => {
    const truth = buildHarborOakServiceSheetProjectTruthMax({ repoRoot: REPO });
    const bad: ServiceSheetProjectTruth = {
      ...truth,
      services: truth.services.map((s, i) =>
        i === 4
          ? { ...s, priceMode: "contact_for_pricing", priceDisplay: "" }
          : s,
      ),
    };
    expect(() => reasonServiceSheetDesignSpecDeterministic(bad)).toThrow(
      /contact_for_pricing requires customer price text/i,
    );
  });

  it("11th service fails closed", () => {
    const truth = buildHarborOakServiceSheetProjectTruthMax({ repoRoot: REPO });
    const bad: ServiceSheetProjectTruth = {
      ...truth,
      services: [
        ...truth.services,
        {
          serviceId: "svc-11",
          name: "Extra",
          priceMode: "listed",
          priceDisplay: "$1",
        },
      ],
    };
    expect(() => assertServiceSheetRequiredTruth(bad)).toThrow(/exceed/i);
  });

  it("customer mode rejects certification fixture leakage", () => {
    const truth = buildHarborOakServiceSheetProjectTruthMax({ repoRoot: REPO });
    const bad: ServiceSheetProjectTruth = {
      ...truth,
      outputMode: "customer",
    };
    expect(() => assertServiceSheetRequiredTruth(bad)).toThrow(
      /FIXTURE_LEAKAGE/i,
    );
  });

  it("completeness rejects invented contact_for_pricing without authorization", () => {
    const truth = buildHarborOakServiceSheetProjectTruthMax({ repoRoot: REPO });
    const omittedOnly: ServiceSheetProjectTruth = {
      ...truth,
      services: truth.services.map((s) =>
        s.priceMode === "contact_for_pricing"
          ? { ...s, priceMode: "omitted" as const, priceDisplay: undefined }
          : s,
      ),
      requiredTextTokens: ["Harbor", "Spring HVAC Tune-Up", "$189"],
    };
    const spec = reasonServiceSheetDesignSpecDeterministic(omittedOnly);
    const poisoned: ServiceSheetDesignSpec = {
      ...spec,
      layers: [
        ...spec.layers,
        {
          type: "text",
          id: "fake-price",
          role: "service_price",
          content: FIXTURE_CONTACT_FOR_PRICING_LINE,
          x: 0,
          y: 0,
          width: 100,
          fontSizePx: 14,
          fontWeight: 500,
          lineHeight: 1.2,
          color: "#000",
          align: "right",
          serviceId: "svc-8",
        },
      ],
    };
    const declared = declaredTextFromServiceSheetSpec(poisoned);
    const check = verifyServiceSheetCompletenessAndPrices(
      omittedOnly,
      poisoned,
      declared,
    );
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.message).toMatch(
        /without customer-authorized|Price layer count|Omitted mode/i,
      );
    }
  });

  it("spec fingerprint stable for identical truth", () => {
    const truth = buildHarborOakServiceSheetProjectTruthMax({ repoRoot: REPO });
    const a = reasonServiceSheetDesignSpecDeterministic(truth);
    const b = reasonServiceSheetDesignSpecDeterministic(truth);
    expect(fingerprintServiceSheetDesignSpec(a)).toBe(
      fingerprintServiceSheetDesignSpec(b),
    );
    expect(a.layoutMode).toBe("single_column");
    expect(a.typographyMode).toBe("comfortable");
  });

  it(
    "MAXIMUM 10-service mixed-pricing proof — PNG/PDF, completeness, Owner NONE",
    async () => {
      const truth = buildHarborOakServiceSheetProjectTruthMax({
        repoRoot: REPO,
      });
      const result = await runServiceSheetProofPipeline({
        repoRoot: REPO,
        truth,
        artifactRootRel: SERVICE_SHEET_PROOF_ARTIFACT_ROOT,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) {
        // eslint-disable-next-line no-console
        console.error(result);
        return;
      }
      expect(result.verdict).toBe("SERVICE_SHEET_RENDERER_PROOF_PASS");
      expect(result.canvaUsed).toBe(false);
      expect(result.makeUsed).toBe(false);
      expect(result.ownerRoutineProduction).toBe("NONE");
      expect(result.identity.serviceCount).toBe(10);
      expect(result.identity.listedCount).toBeGreaterThanOrEqual(3);
      expect(result.identity.contactForPricingCount).toBe(1);
      expect(result.identity.omittedCount).toBeGreaterThanOrEqual(1);
      expect(result.identity.widthPx).toBe(SERVICE_SHEET_CANVAS.widthPx);
      expect(result.identity.heightPx).toBe(SERVICE_SHEET_CANVAS.heightPx);
      expect(result.identity.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result.identity.pdfContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result.overflowOk).toBe(true);
      expect(result.designSpec.typographyMode).toBe("comfortable");
      expect(result.declaredText).toContain("$189");
      expect(result.declaredText).toContain(FIXTURE_CONTACT_FOR_PRICING_LINE);
      expect(result.declaredText).toContain("Custom Remodel Coordination");
      // Omitted rows must not invent filler next to their names in price layers
      const omittedIds = truth.services
        .filter((s) => s.priceMode === "omitted")
        .map((s) => s.serviceId);
      for (const id of omittedIds) {
        const priceLayer = result.designSpec.layers.find(
          (l) =>
            l.type === "text" &&
            l.role === "service_price" &&
            l.serviceId === id,
        );
        expect(priceLayer).toBeUndefined();
      }
      const pngAbs = path.join(REPO, result.identity.pngRelativePath);
      expect(readFileSync(pngAbs).length).toBeGreaterThan(1000);
    },
    180_000,
  );

  it(
    "forced QA failure blocks readiness",
    async () => {
      const truth = buildHarborOakServiceSheetProjectTruthMax({
        repoRoot: REPO,
      });
      const result = await runServiceSheetProofPipeline({
        repoRoot: REPO,
        truth: {
          ...truth,
          campaignId: "camp-design-service-sheet-proof-fail-qa",
          jobId: "camp-design-service-sheet-proof-fail-qa::v2-rtu-service-sheet",
          dispatchId:
            "dd:camp-design-service-sheet-proof-fail-qa::v2-rtu-service-sheet",
        },
        artifactRootRel: `${SERVICE_SHEET_PROOF_ARTIFACT_ROOT}-fail-qa`,
        forceQaFail: true,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.failureCode).toBe("QA_FAILURE");
    },
    180_000,
  );
});

describe("flyer/card/menu regression protection (service-sheet proof)", () => {
  it(
    "flyer proof pipeline still PASSes",
    async () => {
      const truth = buildHarborOakFlyerProjectTruth({ repoRoot: REPO });
      const result = await runDesignRendererProofPipeline({
        repoRoot: REPO,
        truth,
      });
      expect(result.ok).toBe(true);
    },
    180_000,
  );

  it(
    "business-card proof pipeline still PASSes",
    async () => {
      const truth = buildHarborOakBusinessCardProjectTruth({ repoRoot: REPO });
      const result = await runBusinessCardProofPipeline({
        repoRoot: REPO,
        truth,
      });
      expect(result.ok).toBe(true);
    },
    180_000,
  );

  it(
    "menu proof pipeline still PASSes",
    async () => {
      const truth = buildSaltCedarMenuProjectTruthMax({ repoRoot: REPO });
      const result = await runMenuProofPipeline({
        repoRoot: REPO,
        truth,
      });
      expect(result.ok).toBe(true);
    },
    180_000,
  );
});
