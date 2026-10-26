import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  unsupportedMenuClaims,
  verifyMenuItemCompletenessAndPrices,
} from "./menu-completeness";
import { buildSaltCedarMenuProjectTruthSmall } from "./menu-fixtures";
import { runMenuRendererPipeline } from "./menu-pipeline";
import { reasonMenuDesignSpecDeterministic } from "./menu-reason";
import { declaredTextFromMenuSpec } from "./menu-render-html";
import type { MenuDesignSpec, MenuTextLayer } from "./menu-types";

const REPO = path.resolve(__dirname, "../../..");

function withClaim(spec: MenuDesignSpec, content: string): MenuDesignSpec {
  const sample = spec.layers.find((layer) => layer.type === "text");
  if (!sample || sample.type !== "text") throw new Error("seed has no text layer");
  const invented: MenuTextLayer = {
    ...sample,
    id: `invented-${content.length}`,
    role: "descriptor",
    content,
  };
  return { ...spec, layers: [...spec.layers, invented] };
}

describe("menu factual accuracy", () => {
  it("accepts a menu whose text is copied from the customer facts", () => {
    const truth = buildSaltCedarMenuProjectTruthSmall({ repoRoot: REPO });
    const spec = reasonMenuDesignSpecDeterministic(truth);
    expect(unsupportedMenuClaims(truth, spec)).toEqual([]);
    const check = verifyMenuItemCompletenessAndPrices(
      truth,
      spec,
      declaredTextFromMenuSpec(spec),
    );
    expect(check.ok).toBe(true);
  });

  it("rejects an unsupported bakery claim before a file is written", async () => {
    const truth = buildSaltCedarMenuProjectTruthSmall({ repoRoot: REPO });
    const spec = withClaim(
      reasonMenuDesignSpecDeterministic(truth),
      "The healthiest bakery in town",
    );
    const check = verifyMenuItemCompletenessAndPrices(
      truth,
      spec,
      declaredTextFromMenuSpec(spec),
    );
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.message).toMatch(/healthiest bakery in town/);

    const artifactRootRel = "data/campaign-design-artifacts/menu-factual-accuracy-reject";
    const result = await runMenuRendererPipeline({
      repoRoot: REPO,
      truth: {
        ...truth,
        campaignId: "menu-factual-accuracy-reject",
        jobId: "menu-factual-accuracy-reject::v2-rtu-menu",
        dispatchId: "dd:menu-factual-accuracy-reject::v2-rtu-menu",
      },
      artifactRootRel,
      specOverride: spec,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("QA_FAILURE");
    expect(existsSync(path.join(REPO, artifactRootRel))).toBe(false);
  });
});
