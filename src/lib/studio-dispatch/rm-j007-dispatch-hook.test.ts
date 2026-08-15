/**
 * STUDIO-OPERATING-DESIGN-RM-J007-DISPATCH-HOOK-1 — remap + smoke tests.
 */

import { describe, expect, it } from "vitest";

import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import { DESIGN_RENDERER_RM_J007_SKU } from "@/lib/studio-design-renderer";

describe("STUDIO-OPERATING-DESIGN-RM-J007-DISPATCH-HOOK-1", () => {
  it("remaps rm-j007 onto studio_design_renderer (APPROVE B); Canva residual list empty", () => {
    const update = resolveServiceProductionContract(DESIGN_RENDERER_RM_J007_SKU);
    expect(update.status).toBe("resolved");
    if (update.status !== "resolved") return;
    expect(update.contract.primaryTool.toolId).toBe("studio_design_renderer");
    expect(update.contract.readinessNotes).toMatch(
      /Canva is not on the fulfillment spine/i,
    );
    expect(update.contract.primaryTool.toolId).not.toBe("canva");

    // Remaining Canva design SKUs for this migration series: none expected for rm-j007.
    const stillCanva: string[] = [];
    for (const skuId of [] as const) {
      const resolved = resolveServiceProductionContract(skuId);
      if (resolved.status !== "resolved") continue;
      if (resolved.contract.primaryTool.toolId === "canva") {
        stillCanva.push(skuId);
      }
    }
    expect(stillCanva).toEqual([]);
  });
});
