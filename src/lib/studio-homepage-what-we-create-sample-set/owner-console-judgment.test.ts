import { describe, expect, it } from "vitest";
import { homepageWhatWeCreate } from "@/config/studio-homepage-lobby-rebuild-v1";
import { homepageWhatWeCreateSampleSetV1 as cfg } from "@/config/studio-homepage-what-we-create-sample-set-v1";

describe("What We Create sample set factory lock", () => {
  it("keeps the exact 8 categories in locked order", () => {
    expect(cfg.categories.map((item) => item.label)).toEqual(
      homepageWhatWeCreate.items.map((item) => item.label),
    );
    expect(cfg.noCategorySubstitutions).toBe(true);
    expect(cfg.noAdditions).toBe(true);
    expect(cfg.noOrderChanges).toBe(true);
  });

  it("returns one Owner packet and forbids Page 1 integration before approve", () => {
    expect(cfg.onePacketOnly).toBe(true);
    expect(cfg.doNotIntegrateUntilFullSetApprove).toBe(true);
    expect(cfg.raiseOnlyAfterQualityPass).toBe(true);
    expect(cfg.noVideo2).toBe(true);
    expect(cfg.noVideo3).toBe(true);
    expect(cfg.noPage2).toBe(true);
    expect(cfg.doNotPublish).toBe(true);
    expect(cfg.doNotMerge).toBe(true);
    expect(cfg.doNotPush).toBe(true);
    expect(cfg.doNotRemintMaya).toBe(true);
  });
});
