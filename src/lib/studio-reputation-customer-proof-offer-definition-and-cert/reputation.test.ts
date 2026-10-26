import { mkdtempSync, readFileSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  REPUTATION_PROOF_V1_CAMPAIGN_ID,
  studioReputationCustomerProofOfferDefinitionAndCertV1 as pack,
} from "@/config/studio-reputation-customer-proof-offer-definition-and-cert-v1";
import { assembleReputationProofCopy } from "./copy";
import { reputationProofFactoryCapabilityMap } from "./capability-map";
import { marigoldGroomingIntake } from "./marigold";
import { runReputationProofV1Cert } from "./run-cert";

describe("STUDIO-REPUTATION-CUSTOMER-PROOF-OFFER-DEFINITION-AND-CERT-1", () => {
  it("keeps the kit unpublished, unpriced, and a headline candidate only", () => {
    expect(pack.doNotPublish).toBe(true);
    expect(pack.liveCatalogSku).toBeNull();
    expect(pack.priceCents).toBeNull();
    expect(pack.placement).toBe("headline_package_candidate");
    expect(pack.fourPackagePlacement).toBe("HEADLINE_PACKAGE");
    expect(pack.testimonialLimit).toBe(1);
  });

  it("does not use video testimonials, logins, or invented reviews", () => {
    const map = reputationProofFactoryCapabilityMap();
    expect(map.find((row) => row.id === "video_testimonial")?.readiness).toBe("DO_NOT_USE");
    expect(map.find((row) => row.id === "account_login")?.readiness).toBe("DO_NOT_USE");
    expect(map.find((row) => row.id === "qr_print_asset")?.readiness).toBe(
      "READY_WITH_EXPLICIT_LIMITS",
    );
    expect(map.find((row) => row.id === "rights_confirmation")?.readiness).toBe(
      "READY_WITH_EXPLICIT_LIMITS",
    );
  });

  it("runs Marigold Grooming intake → rights gate → production → QA → revision → delivery", async () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "reputation-"));
    try {
      const cert = await runReputationProofV1Cert(repoRoot);
      expect(cert.firstOk).toBe(true);
      expect(cert.revisionOk).toBe(true);
      expect(cert.revisedCta).toBe("Share your visit");
      expect(cert.rightsBlocked).toBe(true);
      expect(cert.rewriteBlocked).toBe(true);
      expect(cert.inventedBlocked).toBe(true);
      expect(cert.isolation.coleRiver).toBe(true);
      expect(cert.isolation.noHarbor).toBe(true);
      expect(cert.isolation.campaignRoot).toBe(true);
      expect(cert.fetchedReviews).toBe(false);
      expect(cert.accountAccessRequired).toBe(false);
      expect(cert.videoIncluded).toBe(false);
      expect(cert.ownerProductionMinutes).toBe(0);
      expect(cert.classification).toBe("B_READY_WITH_EXPLICIT_LIMITS");
      expect(cert.fourPackagePlacement).toBe("HEADLINE_PACKAGE");
      expect(cert.plates.square).toEqual({ widthPx: 1024, heightPx: 1024 });
      expect(cert.plates.portrait).toEqual({ widthPx: 1024, heightPx: 1536 });

      const assembled = assembleReputationProofCopy(marigoldGroomingIntake());
      expect(assembled.ok).toBe(true);
      if (!assembled.ok) return;
      expect(assembled.copy.usedQuote).toContain("anxious rescue");
      expect(assembled.copy.caption).toContain("Dana P.");
      expect(assembled.copy.caption).not.toMatch(/Harbor|Cole|five-star|guaranteed/i);

      const card = readFileSync(
        path.join(
          repoRoot,
          `data/campaign-design-artifacts/${REPUTATION_PROOF_V1_CAMPAIGN_ID}/reputation-proof-v1/review-card.html`,
        ),
        "utf8",
      );
      expect(card).toContain("https://reviews.example/marigold");
      expect(card).toContain("data:image/png;base64,");
      expect(card).toContain("The Studio does not post this for you");
      expect(card).toContain("share your visit");
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
