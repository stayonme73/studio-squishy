import { mkdtempSync, readFileSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import { studioAiLocalVisibilityOfferDefinitionAndCertV1 as pack } from "@/config/studio-ai-local-visibility-offer-definition-and-cert-v1";
import { assembleLocalVisibilityPack } from "./assemble";
import { localVisibilityFactoryCapabilityMap } from "./capability-map";
import { northsideBikeIntake } from "./northside";
import { runLocalVisibilityV1Cert } from "./run-cert";

describe("STUDIO-AI-LOCAL-VISIBILITY-OFFER-DEFINITION-AND-CERT-1", () => {
  it("keeps Local Visibility unpublished, unpriced, and included-support only", () => {
    expect(pack.doNotPublish).toBe(true);
    expect(pack.liveCatalogSku).toBeNull();
    expect(pack.priceCents).toBeNull();
    expect(pack.placement).toBe("included_support_only");
    expect(pack.fourPackagePlacement).toBe("INCLUDED_SUPPORT_CAPABILITY");
    expect(pack.publicInformation.forbidden).toContain("fetch_or_scrape_website");
  });

  it("does not use live research, logins, or ranking promises", () => {
    const map = localVisibilityFactoryCapabilityMap();
    expect(map.find((row) => row.id === "public_source_inspection")?.readiness).toBe(
      "DO_NOT_USE",
    );
    expect(map.find((row) => row.id === "account_login")?.readiness).toBe("DO_NOT_USE");
    expect(map.find((row) => row.id === "ranking_promises")?.readiness).toBe("DO_NOT_USE");
    expect(map.find((row) => row.id === "copy_generation")?.readiness).toBe(
      "READY_WITH_EXPLICIT_LIMITS",
    );
  });

  it("runs Northside Bike intake → analysis → production → fact QA → revision → delivery", () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "local-vis-"));
    try {
      const cert = runLocalVisibilityV1Cert(repoRoot);
      expect(cert.firstOk).toBe(true);
      expect(cert.revisionOk).toBe(true);
      expect(cert.revisedHours).toBe("Tue-Sat 10-4");
      expect(cert.conflictBlocked).toBe(true);
      expect(cert.inventedBlocked).toBe(true);
      expect(cert.isolation.coleRiver).toBe(true);
      expect(cert.isolation.noHarbor).toBe(true);
      expect(cert.isolation.campaignRoot).toBe(true);
      expect(cert.fetchedWebsite).toBe(false);
      expect(cert.accountAccessRequired).toBe(false);
      expect(cert.rankingPromised).toBe(false);
      expect(cert.ownerProductionMinutes).toBe(0);
      expect(cert.classification).toBe("B_READY_WITH_EXPLICIT_LIMITS");
      expect(cert.fourPackagePlacement).toBe("INCLUDED_SUPPORT_CAPABILITY");

      const assembled = assembleLocalVisibilityPack(northsideBikeIntake());
      expect(assembled.ok).toBe(true);
      if (!assembled.ok) return;
      expect(assembled.pack.businessDescription).toContain("Northside Bike Repair");
      expect(assembled.pack.businessDescription).toContain("Richmond");
      expect(assembled.pack.businessDescription).toContain("flat repair");
      expect(assembled.pack.businessDescription).not.toMatch(
        /rank|leads|sales|Harbor|Cole|since 2009|Sunday/i,
      );
      const guide = readFileSync(
        path.join(
          repoRoot,
          `data/campaign-design-artifacts/${pack.liveCatalogSku ?? "camp-local-visibility-v1-northside-bike-20261003"}/local-visibility-v1/implementation-guide.txt`,
        ),
        "utf8",
      );
      expect(guide).toContain("The Studio will not log in");
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
