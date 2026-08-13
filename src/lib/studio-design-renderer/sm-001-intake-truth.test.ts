/**
 * STUDIO-OPERATING-DESIGN-SM-001-INTAKE-TRUTH-1
 */

import { describe, expect, it } from "vitest";

import { SM_001_PROOF_CONTRACT } from "./sm-001-contracts";
import {
  SM_001_LAYOUT_TEMPLATES,
  SM_001_SQUARE_PLATE,
} from "./sm-001-types";
import {
  SM_001_LAYOUT_TEMPLATE_CLASSIFICATION,
  assertSm001StructureExecutableForDispatch,
  detectSm001UnauthorizedFields,
  mapSm001SetStructureFromLiveTruth,
  resolveSm001TimingConstraints,
  type Sm001LiveTruthInput,
} from "./sm-001-intake-truth";

type Richness = "full" | "extended" | "core";

function liveTruth(
  richness: Richness,
  overrides: Partial<Sm001LiveTruthInput> = {},
): Sm001LiveTruthInput {
  return {
    businessName: "Harbor Oak Home Services",
    offerName: "Spring Service Special",
    priceDisplay: "$189",
    cta: "Call to book",
    dateWindow: "March 10 – April 15, 2026",
    phone: "(555) 010-4477",
    headline: richness === "core" ? "" : "Spring service you can trust",
    body:
      richness === "core"
        ? ""
        : "HVAC tune-up and drain clear for homeowners who want plain, steady service.",
    wasPriceDisplay: richness === "full" ? "was $249" : undefined,
    materials: { hasLogo: true },
    ...overrides,
  };
}

describe("sm-001 intake structure truth (INTAKE-TRUTH-1)", () => {
  it("classifies layout templates as Studio production — not customer contract or intake selects", () => {
    expect(SM_001_LAYOUT_TEMPLATE_CLASSIFICATION.customerConfigurable).toBe(
      false,
    );
    expect(
      SM_001_LAYOUT_TEMPLATE_CLASSIFICATION.fixedServiceContractRoles,
    ).toBe(false);
    expect(SM_001_LAYOUT_TEMPLATE_CLASSIFICATION.intakeSelectFields).toBe(false);
    expect(
      SM_001_LAYOUT_TEMPLATE_CLASSIFICATION
        .customerPostingDateQuestionsAuthorized,
    ).toBe(false);
    expect([
      ...SM_001_LAYOUT_TEMPLATE_CLASSIFICATION.provenMachineLayoutTemplates,
    ]).toEqual([...SM_001_LAYOUT_TEMPLATES]);
    expect(SM_001_LAYOUT_TEMPLATE_CLASSIFICATION.liveAuthority).toBe(
      "studio_production_layout_assignment",
    );
    expect(
      SM_001_LAYOUT_TEMPLATE_CLASSIFICATION.plannedPostCountAuthority,
    ).toBe("studio_selected_before_execution");
  });

  it("keeps the contract flags honest — intake structure resolved, dispatch Owner-authorized", () => {
    expect(SM_001_PROOF_CONTRACT.liveIntakeSetStructureResolved).toBe(true);
    expect(SM_001_PROOF_CONTRACT.layoutTemplatesAreCustomerContract).toBe(false);
    expect(SM_001_PROOF_CONTRACT.layoutTemplatesAreCustomerIntakeFields).toBe(
      false,
    );
    expect(SM_001_PROOF_CONTRACT.plannedPostCountIsCustomerIntakeField).toBe(
      false,
    );
    expect(SM_001_PROOF_CONTRACT.customerPostingDateQuestionsAuthorized).toBe(
      false,
    );
    // SM-001-DISPATCH-HOOK-1 — Owner-authorized after this intake package.
    expect(SM_001_PROOF_CONTRACT.dispatchHookAuthorized).toBe(true);
    expect(SM_001_PROOF_CONTRACT.primaryToolRemapAuthorized).toBe(true);
  });

  it("maps full campaign richness → N=6 square Launch Set", () => {
    const mapped = mapSm001SetStructureFromLiveTruth(liveTruth("full"));
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;

    expect(mapped.structure.plannedPostCount).toBe(6);
    expect(mapped.structure.plannedPostCountSelection.selectedBeforeExecution).toBe(
      true,
    );
    expect(mapped.structure.plateId).toBe(SM_001_SQUARE_PLATE.plateId);
    expect(mapped.structure.canvas).toEqual({ widthPx: 1024, heightPx: 1024 });
    expect(mapped.structure.executablePlate).toBe("square");
    expect(mapped.structure.captionSource).toBe("studio_written");
    expect(mapped.structure.calendarRequired).toBe(true);
    expect(mapped.structure.postingOrderRequired).toBe(true);
    expect(mapped.structure.assets.map((a) => a.layoutTemplate)).toEqual([
      ...SM_001_LAYOUT_TEMPLATES,
    ]);
  });

  it("maps extended campaign richness → N=5", () => {
    const mapped = mapSm001SetStructureFromLiveTruth(liveTruth("extended"));
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.structure.plannedPostCount).toBe(5);
    expect(mapped.structure.assets).toHaveLength(5);
    expect(mapped.structure.assets.map((a) => a.layoutTemplate)).toEqual(
      SM_001_LAYOUT_TEMPLATES.slice(0, 5),
    );
  });

  it("maps core campaign richness → N=4 without padding to six", () => {
    const mapped = mapSm001SetStructureFromLiveTruth(liveTruth("core"));
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.structure.plannedPostCount).toBe(4);
    expect(mapped.structure.assets).toHaveLength(4);
    expect(mapped.structure.assets.map((a) => a.layoutTemplate)).toEqual(
      SM_001_LAYOUT_TEMPLATES.slice(0, 4),
    );
  });

  it("produces no phantom members at any authorized N", () => {
    for (const richness of ["core", "extended", "full"] as const) {
      const mapped = mapSm001SetStructureFromLiveTruth(liveTruth(richness));
      expect(mapped.ok).toBe(true);
      if (!mapped.ok) return;

      const { plannedPostCount, assets } = mapped.structure;
      expect(assets).toHaveLength(plannedPostCount);
      expect(assets.map((a) => a.orderIndex)).toEqual(
        Array.from({ length: plannedPostCount }, (_, i) => i + 1),
      );
      expect(assets.map((a) => a.assetId)).toEqual(
        Array.from(
          { length: plannedPostCount },
          (_, i) => `social-post-${i + 1}`,
        ),
      );
      expect(new Set(assets.map((a) => a.layoutTemplate)).size).toBe(
        plannedPostCount,
      );
    }
  });

  it("rejects a smuggled post5_layoutTemplate customer override", () => {
    const mapped = mapSm001SetStructureFromLiveTruth(
      liveTruth("full", { post5_layoutTemplate: "proof_point" }),
    );
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.code).toBe("UNAUTHORIZED_CUSTOMER_FIELD");
    expect(mapped.message).toMatch(/post5_layoutTemplate/);
    expect(mapped.message).toMatch(/Studio production assignment/i);
  });

  it("rejects customer post-count and posting-date fields", () => {
    const count = mapSm001SetStructureFromLiveTruth(
      liveTruth("full", { plannedPostCount: 6 }),
    );
    expect(count.ok).toBe(false);
    if (!count.ok) expect(count.message).toMatch(/chosen by the Studio/i);

    const dates = mapSm001SetStructureFromLiveTruth(
      liveTruth("full", { preferredPostingDates: "Mondays" }),
    );
    expect(dates.ok).toBe(false);
    if (!dates.ok) expect(dates.message).toMatch(/posting-date question/i);

    expect(
      detectSm001UnauthorizedFields(liveTruth("full", { post1_role: "x" })),
    ).toEqual(["post1_role"]);
  });

  it("fails closed on missing logo or offer facts instead of guessing N", () => {
    const noLogo = mapSm001SetStructureFromLiveTruth(
      liveTruth("full", { materials: { hasLogo: false } }),
    );
    expect(noLogo.ok).toBe(false);
    if (!noLogo.ok) {
      expect(noLogo.code).toBe("INVALID_PLANNED_POST_COUNT");
      expect(noLogo.message).toMatch(/logo/i);
    }

    const noOffer = mapSm001SetStructureFromLiveTruth(
      liveTruth("full", { priceDisplay: "" }),
    );
    expect(noOffer.ok).toBe(false);
    if (!noOffer.ok) expect(noOffer.code).toBe("INVALID_PLANNED_POST_COUNT");
  });

  it("uses campaign timing constraints and never invents publish dates", () => {
    const withConstraints = mapSm001SetStructureFromLiveTruth(
      liveTruth("full", {
        timingConstraints: {
          startDate: "2026-03-10",
          endDate: "2026-04-15",
          blackoutDates: ["2026-03-17"],
        },
      }),
    );
    expect(withConstraints.ok).toBe(true);
    if (!withConstraints.ok) return;
    expect(withConstraints.structure.timingSource).toBe("campaign_constraints");
    expect(withConstraints.structure.timingConstraints).toEqual({
      startDate: "2026-03-10",
      endDate: "2026-04-15",
      blackoutDates: ["2026-03-17"],
    });

    // Human-readable window stays unparsed — the advisory calendar resolves later.
    const humanWindow = mapSm001SetStructureFromLiveTruth(liveTruth("full"));
    expect(humanWindow.ok).toBe(true);
    if (!humanWindow.ok) return;
    expect(humanWindow.structure.timingConstraints).toEqual({});
    expect(humanWindow.structure.timingSource).toBe("none_pending_advisory");

    const isoWindow = resolveSm001TimingConstraints(
      liveTruth("full", { dateWindow: "2026-03-10 to 2026-04-15" }),
    );
    expect(isoWindow.ok).toBe(true);
    if (!isoWindow.ok) return;
    expect(isoWindow.source).toBe("parsed_date_window");
    expect(isoWindow.timing).toEqual({
      startDate: "2026-03-10",
      endDate: "2026-04-15",
    });
  });

  it("dispatch readiness passes for a valid structure", () => {
    const mapped = mapSm001SetStructureFromLiveTruth(liveTruth("full"));
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(assertSm001StructureExecutableForDispatch(mapped.structure)).toEqual({
      ok: true,
    });
  });

  it("dispatch readiness fails closed on non-square plate", () => {
    const mapped = mapSm001SetStructureFromLiveTruth(liveTruth("full"));
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;

    const portrait = {
      ...mapped.structure,
      plateId: "cert-portrait-1024x1536" as never,
      canvas: { widthPx: 1024, heightPx: 1536 },
    };
    const result = assertSm001StructureExecutableForDispatch(portrait);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_PLATE");
    expect(result.message).toMatch(/square-only/i);
  });

  it("dispatch readiness fails closed on count mismatch and phantom members", () => {
    const mapped = mapSm001SetStructureFromLiveTruth(liveTruth("full"));
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;

    const dropped = assertSm001StructureExecutableForDispatch({
      ...mapped.structure,
      assets: mapped.structure.assets.slice(0, 5),
    });
    expect(dropped.ok).toBe(false);
    if (!dropped.ok) expect(dropped.code).toBe("COUNT_MISMATCH");

    const phantom = assertSm001StructureExecutableForDispatch({
      ...mapped.structure,
      assets: [
        ...mapped.structure.assets.slice(0, 5),
        {
          assetId: "social-post-99",
          orderIndex: 6,
          layoutTemplate: "soft_close" as const,
        },
      ],
    });
    expect(phantom.ok).toBe(false);
    if (!phantom.ok) {
      expect(phantom.code).toBe("SET_CONSISTENCY_FAILURE");
      expect(phantom.message).toMatch(/phantom member/i);
    }

    const outOfRange = assertSm001StructureExecutableForDispatch({
      ...mapped.structure,
      plannedPostCount: 7 as never,
    });
    expect(outOfRange.ok).toBe(false);
    if (!outOfRange.ok)
      expect(outOfRange.code).toBe("INVALID_PLANNED_POST_COUNT");
  });
});
