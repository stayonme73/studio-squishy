/**
 * Creative Director / Creative Critic — inspects the artifact, not just the file.
 * May REJECT: technically correct, creatively insufficient.
 * That rejection is a Studio correction, not a customer revision.
 */

import type { DesignQualityFinding } from "@/lib/studio-kitchen-production/design-quality/types";
import type { FlyerDesignSpec, FlyerProjectTruth } from "@/lib/studio-design-renderer/types";
import { researchCategoryPrinciples } from "./reference-research";
import {
  evaluateFullCanvasComposition,
  measureCanvasDistribution,
} from "./full-canvas";

export type CreativeDirectorVerdict =
  | {
      ok: true;
      commerciallyCompetitive: true;
      summary: string;
    }
  | {
      ok: false;
      commerciallyCompetitive: false;
      action: "studio_correction_required";
      summary: string;
      findings: readonly DesignQualityFinding[];
    };

export function critiqueAsCreativeDirector(input: {
  spec: FlyerDesignSpec;
  truth: FlyerProjectTruth;
}): CreativeDirectorVerdict {
  if (input.truth.outputMode !== "customer" || !input.truth.creativeDirection) {
    return {
      ok: true,
      commerciallyCompetitive: true,
      summary: "CERT/fixture path — Creative Director does not override Harbor plates.",
    };
  }
  const canvas = evaluateFullCanvasComposition(input);
  const report = measureCanvasDistribution(input.spec);
  const findings = [...canvas];
  const medallion = input.spec.layers.some((layer) => layer.id === "offer-medallion");
  if (medallion && !input.truth.creativeDirection.brief.existingBrandColors) {
    findings.push({
      id: "creatively_insufficient",
      severity: "fail",
      checkKind: "creative_quality",
      message:
        "Circular promotional seal reads as a house plate, not a brief-specific design.",
    });
  }
  const principles = researchCategoryPrinciples(
    input.truth.creativeDirection.brief,
  );
  if (report.topHeavy || !report.lowerThirdHasDesignedContent) {
    findings.push({
      id: "creatively_insufficient",
      severity: "fail",
      checkKind: "creative_quality",
      message: `Would a reasonable paying customer consider this professionally designed? No. ${principles.summary} The current artifact is not commercially competitive.`,
    });
  }
  const unique = findings.filter(
    (finding, index) => findings.findIndex((item) => item.id === finding.id) === index,
  );
  if (unique.length === 0) {
    return {
      ok: true,
      commerciallyCompetitive: true,
      summary:
        "Creative Director pass: composition occupies top/mid/bottom, is not a Maya-like plate, and is not words-on-a-field.",
    };
  }
  return {
    ok: false,
    commerciallyCompetitive: false,
    action: "studio_correction_required",
    summary: unique.map((finding) => finding.message).join(" "),
    findings: unique,
  };
}
