import { mkdtempSync, readFileSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import { CLIP_REPURPOSING_PUBLISH_DRAFT } from "@/catalog/v2/clip-repurposing-publish";
import { studio549ClipRepurposingBuildV1 as build } from "@/config/studio-549-clip-repurposing-build-v1";
import { studio549ClipRepurposingValueDeliveryV1 as value } from "@/config/studio-549-clip-repurposing-value-delivery-v1";

import { assembleClip549OwnerValuePackage } from "./assemble-cert";
import {
  CLIP_549_VALUE_CERT_IDENTITY,
  CLIP_549_VALUE_CERT_SHORTS,
  assertCertSetMatchesVideoQuality,
} from "./cert-set";
import { scaleClip549ValueLayer, writeClip549PostCaption } from "./copy";
import { estimateClip549ValueEconomics } from "./economics";
import { assembleClip549ValuePackage } from "./package";
import { CLIP_549_PATHWAY_SERVICES, clip549PathwayCopy } from "./pathway";

const REPO = path.resolve(__dirname, "../../..");
const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("STUDIO-$549-CLIP-REPURPOSING-VALUE-DELIVERY-1", () => {
  it("stays unpublished and does not change the public catalog", () => {
    expect(value.started).toBe(true);
    expect(value.authorizedToStart).toBe(true);
    expect(value.doNotPublish).toBe(true);
    expect(value.published).toBe(false);
    expect(value.doNotChangePublicCatalog).toBe(true);
    expect(value.designedCoverGraphics).toBe(false);
    expect(value.studioWideUnboxingArchitecture).toBe(false);
    expect(value.doNotReopenVideoEngineeringUnlessRegression).toBe(true);
    expect(value.classification).toBe("CONTENT_ACCEPTED_PRESENTATION_REJECTED");
    expect(value.contentAcceptedInPrinciple).toBe(true);
    expect(value.presentationAccepted).toBe(false);
    expect(value.doNotPolishTanPage).toBe(true);
    expect(value.finalDeliveryRoomAuthorizedToStart).toBe(true);
    expect(value.nextPresentationPackage).toBe("STUDIO-FINAL-DELIVERY-ROOM-1");
    expect(build.videoQualityClassification).toBe(
      "OWNER_CERTIFIED_WITH_EXPLICIT_LIMITS",
    );
    expect(CLIP_REPURPOSING_PUBLISH_DRAFT.includedDeliverables[0]?.quantity).toBe(3);
    expect(CLIP_REPURPOSING_PUBLISH_DRAFT.turnaround).toBe(
      "3–5 business days after intake",
    );
  });

  it("scales captions, titles, and hashtags to 3, 4, or 5 delivered shorts", () => {
    const three = scaleClip549ValueLayer({
      delivered: CLIP_549_VALUE_CERT_SHORTS.slice(0, 3),
      ctaText: CLIP_549_VALUE_CERT_IDENTITY.ctaText,
    });
    expect(three.ok).toBe(true);
    if (!three.ok) return;
    expect(three.captions).toHaveLength(3);
    expect(three.titles).toHaveLength(3);
    expect(three.discovery).toHaveLength(3);

    const four = scaleClip549ValueLayer({
      delivered: CLIP_549_VALUE_CERT_SHORTS.slice(0, 4),
      ctaText: CLIP_549_VALUE_CERT_IDENTITY.ctaText,
    });
    expect(four.ok).toBe(true);
    if (!four.ok) return;
    expect(four.captions).toHaveLength(4);

    const five = scaleClip549ValueLayer({
      delivered: CLIP_549_VALUE_CERT_SHORTS,
      ctaText: CLIP_549_VALUE_CERT_IDENTITY.ctaText,
    });
    expect(five.ok).toBe(true);
    if (!five.ok) return;
    expect(five.captions).toHaveLength(5);
    expect(five.titles).toHaveLength(5);
    expect(five.discovery).toHaveLength(5);
    expect(five.discovery[0]!.hashtags.join(" ")).toMatch(/#menu|#impressive/);
    expect(five.discovery.map((row) => row.hashtags.join(" ")).join(" ")).not.toMatch(
      /#think|#more|#looks|#saying/,
    );

    expect(
      scaleClip549ValueLayer({
        delivered: CLIP_549_VALUE_CERT_SHORTS.slice(0, 2),
        ctaText: CLIP_549_VALUE_CERT_IDENTITY.ctaText,
      }).ok,
    ).toBe(false);
  });

  it("keeps captions on the spoken idea and CTA without performance claims", () => {
    const caption = writeClip549PostCaption({
      clipId: "c-56-423",
      spokenIdea: CLIP_549_VALUE_CERT_SHORTS[0]!.spokenIdea,
      ctaText: CLIP_549_VALUE_CERT_IDENTITY.ctaText,
    });
    expect("ok" in caption && caption.ok === false).toBe(false);
    if ("ok" in caption) return;
    expect(caption.text).toContain("bigger menu");
    expect(caption.text).toContain(CLIP_549_VALUE_CERT_IDENTITY.ctaText);
    expect(caption.text).not.toMatch(/reach|viral|ranking|algorithm/i);
    expect(
      writeClip549PostCaption({
        clipId: "bad",
        spokenIdea: "This will go viral and increase sales.",
        ctaText: "Start here",
      }),
    ).toMatchObject({ ok: false });
  });

  it("keeps pathway educational and omits unfinished offers as available now", () => {
    const pathway = clip549PathwayCopy();
    expect(CLIP_549_PATHWAY_SERVICES.every((row) => row.availableNow)).toBe(true);
    expect(pathway.services.map((row) => row.skuId)).toEqual([
      "v2-rtu-short-form-video-edit",
      "v2-rtu-social-posts",
      "v2-rtu-promotion-graphics",
      "v2-rtu-email-kit",
      "v2-rtu-sms-kit",
    ]);
    const available = pathway.services
      .map((row) => `${row.name} ${row.definition} ${row.whatItProvides} ${row.howItMayComplement}`)
      .join(" ");
    expect(available).not.toMatch(/ad creative|ai \+ local visibility/i);
    expect(pathway.closing).toMatch(/not sellable yet/i);
    expect(pathway.lead).toMatch(/not promised to improve sales/i);
  });

  it("keeps $549 sustainable after the value layer", () => {
    const economics = estimateClip549ValueEconomics();
    expect(economics.valueLayerVendorUsd).toBe(0);
    expect(economics.combinedVendorWorstUsd).toBeLessThan(549);
    expect(economics.sustainableAt549).toBe(true);
    expect(economics.qualityReduced).toBe(false);
    expect(economics.scopeNarrowed).toBe(false);
    expect(economics.priceChanged).toBe(false);
  });

  it("assembles a temp 3-clip package without cover files", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "clip549-value-"));
    temps.push(dir);
    const sources = CLIP_549_VALUE_CERT_SHORTS.slice(0, 3).map((short) =>
      path.join(
        REPO,
        `docs/launch/studio-549-clip-repurposing-build-1/owner-cert-stable-open/delivery/${short.clipId}.mp4`,
      ),
    );
    const assembled = assembleClip549ValuePackage({
      repoRoot: REPO,
      outputDir: dir,
      identity: CLIP_549_VALUE_CERT_IDENTITY,
      delivered: CLIP_549_VALUE_CERT_SHORTS.slice(0, 3),
      sourceMp4AbsolutePaths: sources,
    });
    expect(assembled.ok).toBe(true);
    if (!assembled.ok) return;
    expect(assembled.deliveredCount).toBe(3);
    expect(assembled.shortRelativePaths).toHaveLength(3);
    const html = readFileSync(path.join(dir, "index.html"), "utf8");
    expect(html).toContain("Your Clip Repurposing delivery");
    expect(html).toContain("Designed cover graphics are not part of this delivery");
    expect(html).not.toContain("cover-01.png");
  });

  it("writes the Owner-inspect five-clip package from the certified MP4s", () => {
    expect(assertCertSetMatchesVideoQuality()).toBe(true);
    const assembled = assembleClip549OwnerValuePackage({
      repoRoot: REPO,
      alsoCopyToDesktop: true,
    });
    expect(assembled.ok).toBe(true);
    if (!assembled.ok) return;
    const html = readFileSync(path.join(assembled.packageDir, "index.html"), "utf8");
    expect(html).toContain("01-c-56-423.mp4");
    expect(html).toContain("05-c-50-377.mp4");
    expect(html).toContain("Studio Pathway");
    expect(html).toContain("Start at thestudiocompany7.com");
    expect(assembled.desktopDir).toBeTruthy();
  });
});
