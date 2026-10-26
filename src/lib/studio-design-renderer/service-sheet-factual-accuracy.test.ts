import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  unsupportedServiceSheetClaims,
  verifyServiceSheetCompletenessAndPrices,
} from "./service-sheet-completeness";
import { buildHarborOakServiceSheetProjectTruthMax } from "./service-sheet-fixtures";
import { runServiceSheetRendererPipeline } from "./service-sheet-pipeline";
import { reasonServiceSheetDesignSpecDeterministic } from "./service-sheet-reason";
import { declaredTextFromServiceSheetSpec } from "./service-sheet-render-html";
import type { ServiceSheetDesignSpec, ServiceSheetTextLayer } from "./service-sheet-types";

const REPO = path.resolve(__dirname, "../../..");

function withClaim(spec: ServiceSheetDesignSpec, content: string): ServiceSheetDesignSpec {
  const sample = spec.layers.find((layer) => layer.type === "text");
  if (!sample || sample.type !== "text") throw new Error("seed has no text layer");
  const invented: ServiceSheetTextLayer = {
    ...sample,
    id: "invented-claim",
    role: "descriptor",
    content,
  };
  return { ...spec, layers: [...spec.layers, invented] };
}

describe("service-sheet factual accuracy", () => {
  it("accepts a sheet whose text is copied from the customer facts", () => {
    const truth = buildHarborOakServiceSheetProjectTruthMax({ repoRoot: REPO });
    const spec = reasonServiceSheetDesignSpecDeterministic(truth);
    expect(unsupportedServiceSheetClaims(truth, spec)).toEqual([]);
    const check = verifyServiceSheetCompletenessAndPrices(
      truth,
      spec,
      declaredTextFromServiceSheetSpec(spec),
    );
    expect(check.ok).toBe(true);
  });

  it("rejects an unsupported tagline and an unsupported service claim before release", async () => {
    const truth = buildHarborOakServiceSheetProjectTruthMax({ repoRoot: REPO });
    const spec = withClaim(
      reasonServiceSheetDesignSpecDeterministic(truth),
      "Professional Home Care You Can Trust",
    );
    const withBoth = withClaim(spec, "Comprehensive inspection & cleaning");
    const check = verifyServiceSheetCompletenessAndPrices(
      truth,
      withBoth,
      declaredTextFromServiceSheetSpec(withBoth),
    );
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.message).toMatch(/Professional Home Care You Can Trust/);
    expect(check.message).toMatch(/Comprehensive inspection & cleaning/);

    const artifactRootRel = "data/campaign-design-artifacts/service-sheet-factual-accuracy-reject";
    const result = await runServiceSheetRendererPipeline({
      repoRoot: REPO,
      truth: {
        ...truth,
        campaignId: "service-sheet-factual-accuracy-reject",
        jobId: "service-sheet-factual-accuracy-reject::v2-rtu-service-sheet",
        dispatchId: "dd:service-sheet-factual-accuracy-reject::v2-rtu-service-sheet",
      },
      artifactRootRel,
      specOverride: withBoth,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("QA_FAILURE");
    expect(result.message).toMatch(/Professional Home Care You Can Trust/);
    expect(existsSync(path.join(REPO, artifactRootRel))).toBe(false);
  });
});
