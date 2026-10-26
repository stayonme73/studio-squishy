import { describe, expect, it } from "vitest";

import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";
import {
  PRODUCT_INPUT_OUTPUT_CONTRACT_SECTIONS,
  studioProductInputOutputContractV1,
} from "@/config/studio-product-input-output-contract-v1";
import {
  clipRepurposingBoundaryContractV1,
  contentPackContractFindings,
  shortFormContentPackContractV1,
  studioShortFormContentPackV1,
} from "@/config/studio-short-form-content-pack-v1";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

describe("Short-Form Content Pack definition", () => {
  it("keeps $349 and $549 and does not start Clip", () => {
    expect(studioShortFormContentPackV1.publicPriceCentsUnchanged).toBe(34900);
    expect(studioShortFormContentPackV1.clipPriceCentsUnchanged).toBe(54900);
    expect(studioShortFormVideoEditingBuildV1.sku.priceCents).toBe(34900);
    expect(studioClipRepurposingBuildV1.sku.priceCents).toBe(54900);
    expect(studioShortFormContentPackV1.doNotStartClipFromThisDefinition).toBe(
      true,
    );
    expect(studioShortFormContentPackV1.publicCatalogSwitched).toBe(true);
    expect(contentPackContractFindings()).toEqual([]);
  });

  it("requires the four-part input/output contract on both flagships", () => {
    expect(studioProductInputOutputContractV1.requiredForEverySellableProduct).toBe(
      true,
    );
    expect(studioProductInputOutputContractV1.requiredForFutureMenuWork).toBe(
      true,
    );
    for (const section of PRODUCT_INPUT_OUTPUT_CONTRACT_SECTIONS) {
      expect(shortFormContentPackContractV1[section].length).toBeGreaterThan(0);
      expect(clipRepurposingBoundaryContractV1[section].length).toBeGreaterThan(0);
    }
  });

  it("keeps the $349 / $549 boundary in customer language", () => {
    expect(shortFormContentPackContractV1.important).toMatch(/Clip Repurposing/i);
    expect(shortFormContentPackContractV1.whatsNotIncluded.join(" ")).toMatch(
      /long recording/i,
    );
    expect(clipRepurposingBoundaryContractV1.studioDelivers.join(" ")).toMatch(
      /up to 5/i,
    );
    expect(clipRepurposingBoundaryContractV1.important).toMatch(
      /not 5 guaranteed/i,
    );
    expect(clipRepurposingBoundaryContractV1.whatsNotIncluded.join(" ")).toMatch(
      /filler/i,
    );
  });
});
