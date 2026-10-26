import { mkdtempSync, readFileSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import { studioAdCreativeOfferDefinitionAndCertV1 as pack } from "@/config/studio-ad-creative-offer-definition-and-cert-v1";
import { adCreativeFactoryCapabilityMap } from "./capability-map";
import { mapleWickIntake } from "./maple-wick";
import { writeAdCreativePackage } from "./package";
import { runAdCreativeV1Cert } from "./run-cert";

describe("STUDIO-AD-CREATIVE-OFFER-DEFINITION-AND-CERT-1", () => {
  it("keeps Ad Creative unpublished, unpriced, and off the live menu", () => {
    expect(pack.doNotPublish).toBe(true);
    expect(pack.liveCatalogSku).toBeNull();
    expect(pack.priceCents).toBeNull();
    expect(pack.placement).toBe("included_support_only");
    expect(pack.revisionLimit).toBe(1);
  });

  it("maps factory pieces without promising video ads or account access", () => {
    const map = adCreativeFactoryCapabilityMap();
    expect(map.find((row) => row.id === "static_graphics")?.readiness).toBe(
      "READY_WITH_EXPLICIT_LIMITS",
    );
    expect(map.find((row) => row.id === "short_form_video")?.readiness).toBe("DO_NOT_USE");
    expect(map.find((row) => row.id === "ad_accounts")?.readiness).toBe("DO_NOT_USE");
    expect(map.find((row) => row.id === "copy_headline")?.readiness).toBe(
      "READY_WITH_EXPLICIT_LIMITS",
    );
  });

  it("runs Maple & Wick intake → package → claims QA → revision → delivery", () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "ad-creative-"));
    try {
      const cert = runAdCreativeV1Cert(repoRoot);
      expect(cert.claimsOk).toBe(true);
      expect(cert.firstOk).toBe(true);
      expect(cert.revisionOk).toBe(true);
      expect(cert.revisedHeadline).toBe("Light fall at Maple & Wick");
      expect(cert.inventedBlocked).toBe(true);
      expect(cert.graphicsSpecOk).toBe(true);
      expect(cert.square).toEqual({ widthPx: 1024, heightPx: 1024 });
      expect(cert.portrait).toEqual({ widthPx: 1024, heightPx: 1536 });
      expect(cert.isolation.coleRiver).toBe(true);
      expect(cert.isolation.noHarborNameInAdText).toBe(true);
      expect(cert.isolation.campaignRoot).toBe(true);
      expect(cert.accountAccessRequired).toBe(false);
      expect(cert.qualitySkipped).toBe(false);
      expect(cert.ownerProductionMinutes).toBe(0);
      expect(cert.classification).toBe("B_READY_WITH_EXPLICIT_LIMITS");

      const intake = mapleWickIntake();
      const packed = writeAdCreativePackage({ repoRoot, intake });
      expect(packed.ok).toBe(true);
      if (!packed.ok) return;
      const text = readFileSync(
        path.join(repoRoot, packed.rootRel, "ad-text.txt"),
        "utf8",
      );
      expect(text).toContain("Maple & Wick");
      expect(text).toContain("$28");
      expect(text).toContain("Shop this week");
      expect(text).not.toMatch(/guaranteed|ROI|Harbor & Oak|Cole & Kindred/i);
      expect(text).toContain("does not log into your ad accounts");
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
