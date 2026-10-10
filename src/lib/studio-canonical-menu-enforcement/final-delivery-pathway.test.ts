import { describe, expect, it } from "vitest";

import { studioCanonicalLaunchTruthV1 as truth } from "@/config/studio-canonical-launch-truth-v1";

import {
  CLIP_DELIVERY_PATHWAY_CLOSING,
  canonicalClipDeliveryPathwayServices,
} from "./final-delivery-pathway";

describe("Final Delivery Room Studio Pathway (Clip delivery)", () => {
  it("lists only the other canonical launch packages, in canonical order, without prices", () => {
    const services = canonicalClipDeliveryPathwayServices();
    const expected = truth.packages.filter((pkg) => pkg.packageId !== "clip_repurposing");
    expect(services.map((service) => service.skuId)).toEqual(expected.map((pkg) => pkg.packageId));
    expect(services.map((service) => service.name)).toEqual(expected.map((pkg) => pkg.customerFacingName));
    for (const service of services) {
      expect(service.priceLabel).toBe("");
      expect(service.definition.length).toBeGreaterThan(0);
      expect(service.whatItProvides.length).toBeGreaterThan(0);
      expect(service.howItMayComplement.length).toBeGreaterThan(0);
    }
  });

  it("carries no old-shelf service or price", () => {
    const text = JSON.stringify([canonicalClipDeliveryPathwayServices(), CLIP_DELIVERY_PATHWAY_CLOSING]);
    expect(text).not.toMatch(
      /Short-Form Content Pack|Make My|Email Campaign Kit|Text Message Campaign Kit|Launch Now|\$\d/,
    );
    expect(CLIP_DELIVERY_PATHWAY_CLOSING).toMatch(/new Clip Repurposing order/);
  });
});
