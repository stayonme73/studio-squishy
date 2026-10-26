/**
 * Live flyer composition — Stage 0 on the customer job path.
 *
 * Harbor CERT fixtures stay on the legacy HTML composer. Customer jobs use this.
 */

import { readFileSync } from "fs";
import path from "path";

import type { FlyerDesignSpec, FlyerProjectTruth } from "@/lib/studio-design-renderer/types";
import { checkBriefCompliance } from "@/lib/studio-static-design-composition/brief-compliance";
import {
  composeFlyerDocument,
  requiredFactValues,
} from "@/lib/studio-static-design-composition/compose-flyer";
import { toFlyerDesignSpec } from "@/lib/studio-static-design-composition/flyer-spec-projection";
import { chromiumStaticDesignRenderer } from "@/lib/studio-static-design-composition/render-chromium";
import { validateDesignDocument } from "@/lib/studio-static-design-composition/validate-document";
import type { StudioDesignDocument } from "@/lib/studio-static-design-composition/types";

import { evaluateLivePrintDelivery, blocksSellablePrint } from "./live-print-claim";
import { assertLiveFactsPreserved } from "./preserve-supplied-facts";

export type LiveFlyerComposeResult =
  | {
      ok: true;
      spec: FlyerDesignSpec;
      document: StudioDesignDocument;
      pngAbsolutePath: string;
      pdfAbsolutePath: string;
      htmlAbsolutePath?: string;
      widthPx: number;
      heightPx: number;
    }
  | { ok: false; code: string; message: string };

export function shouldUseLiveStage0Composition(input: {
  outputMode: FlyerProjectTruth["outputMode"];
  specOverride?: unknown;
}): boolean {
  return input.outputMode === "customer" && input.specOverride == null;
}

/**
 * Live customer jobs must not inject a reasoned spec. `specOverride` is the
 * Harbor CERT / failure-injection latch that keeps those jobs on the legacy
 * HTML composer. Passing one here is what stranded Area 22A on hollow_offer_panel.
 */
export function liveCustomerJobSpecOverride<T>(
  outputMode: FlyerProjectTruth["outputMode"],
  reasonedSpec: T,
): T | undefined {
  return shouldUseLiveStage0Composition({ outputMode })
    ? undefined
    : reasonedSpec;
}

function heroMaterialId(truth: FlyerProjectTruth): string | undefined {
  const hero = truth.materials.find((material) => material.role === "hero");
  if (hero) return hero.materialId;
  const generated = truth.materials.find((material) =>
    material.materialId.includes("hybrid"),
  );
  return generated?.materialId;
}

function readPngSize(absolutePath: string): { width: number; height: number } | null {
  try {
    const bytes = readFileSync(absolutePath);
    if (bytes.length < 24 || bytes.toString("ascii", 1, 4) !== "PNG") return null;
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  } catch {
    return null;
  }
}

function materialPaths(
  repoRoot: string,
  truth: FlyerProjectTruth,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const material of truth.materials) {
    out[material.materialId] = path.join(repoRoot, material.relativePath);
  }
  return out;
}

export async function composeAndRenderLiveFlyer(input: {
  repoRoot: string;
  truth: FlyerProjectTruth;
  stagingDir: string;
}): Promise<LiveFlyerComposeResult> {
  const facts = assertLiveFactsPreserved({
    supplied: [
      { id: "headline", text: input.truth.headline },
      { id: "cta", text: input.truth.cta },
      { id: "offerName", text: input.truth.offerName },
      { id: "priceDisplay", text: input.truth.priceDisplay },
      { id: "phone", text: input.truth.phone },
      { id: "webDisplay", text: input.truth.webDisplay },
    ],
    truthValues: [
      input.truth.headline,
      input.truth.cta,
      input.truth.offerName,
      input.truth.priceDisplay,
      input.truth.phone,
      input.truth.webDisplay,
      input.truth.body,
    ],
    suppliedHeadline: input.truth.headline,
    mappedHeadline: input.truth.headline,
    mappedCta: input.truth.cta,
  });
  if (!facts.ok) {
    return { ok: false, code: facts.code, message: facts.message };
  }

  const document = composeFlyerDocument({
    repoRoot: input.repoRoot,
    truth: input.truth,
    heroMaterialId: heroMaterialId(input.truth),
    revisionEmphasis: input.truth.revisionEmphasis,
  });

  const sourceDimensions: Record<string, { width: number; height: number }> = {};
  const paths = materialPaths(input.repoRoot, input.truth);
  const validation = validateDesignDocument({
    document,
    factValues: requiredFactValues(input.truth),
    sourceDimensions:
      Object.keys(sourceDimensions).length > 0 ? sourceDimensions : undefined,
  });
  if (!validation.ok) {
    return {
      ok: false,
      code: validation.failures[0]?.code ?? "INVALID_DESIGN_SPEC",
      message: validation.failures.map((failure) => failure.message).join(" "),
    };
  }

  const pngAbsolutePath = path.join(input.stagingDir, "flyer.png");
  const pdfAbsolutePath = path.join(input.stagingDir, "flyer.pdf");
  const htmlAbsolutePath = path.join(input.stagingDir, "flyer.html");

  const render = await chromiumStaticDesignRenderer.render({
    document,
    repoRoot: input.repoRoot,
    materialPaths: paths,
    outputs: {
      printPngAbsolutePath: path.join(input.stagingDir, "flyer-print.png"),
      printPdfAbsolutePath: pdfAbsolutePath,
      digitalPngAbsolutePath: pngAbsolutePath,
      htmlAbsolutePath,
    },
  });
  if (!render.ok) {
    return {
      ok: false,
      code: render.failures[0]?.code ?? "RENDER_FAILURE",
      message: render.failures.map((failure) => failure.message).join(" "),
    };
  }

  const compliance = checkBriefCompliance({
    supplied: [
      { id: "headline", label: "Headline", text: input.truth.headline },
      { id: "cta", label: "CTA", text: input.truth.cta },
      ...(input.truth.offerName
        ? [{ id: "offerName", label: "Offer", text: input.truth.offerName }]
        : []),
      ...(input.truth.priceDisplay
        ? [{ id: "price", label: "Price", text: input.truth.priceDisplay }]
        : []),
      ...(input.truth.phone
        ? [{ id: "phone", label: "Phone", text: input.truth.phone }]
        : []),
      ...(input.truth.webDisplay
        ? [{ id: "web", label: "Web", text: input.truth.webDisplay }]
        : []),
    ],
    rendered: render.renderedFacts,
  });
  if (compliance.missing.length > 0) {
    return {
      ok: false,
      code: "BRIEF_COMPLIANCE_MISSING",
      message: `Composed flyer dropped supplied line(s): ${compliance.missing.join(", ")}.`,
    };
  }

  const hero = document.elements.find((element) => element.id === "generated-hero");
  const heroPath = hero?.type === "image" ? paths[hero.materialId] : undefined;
  const measured = heroPath ? readPngSize(heroPath) : null;
  const sourcePx = measured
    ?? (hero ? { width: 1536, height: 1024 } : { width: document.logical.widthPx, height: document.logical.heightPx });
  const printVerdict = evaluateLivePrintDelivery({
    sizeNotes: input.truth.sizeNotes,
    intendedUse: input.truth.intendedUse,
    sourcePx,
    boxInches: { width: render.print.trimWidthIn, height: render.print.trimHeightIn },
  });
  if (blocksSellablePrint(printVerdict)) {
    return {
      ok: false,
      code: "PRINT_RESOLUTION_NOT_LAUNCHABLE",
      message: printVerdict.detail,
    };
  }

  const spec = toFlyerDesignSpec(document, input.truth);
  return {
    ok: true,
    spec,
    document,
    pngAbsolutePath,
    pdfAbsolutePath,
    htmlAbsolutePath,
    widthPx: render.digital?.widthPx ?? document.logical.widthPx,
    heightPx: render.digital?.heightPx ?? document.logical.heightPx,
  };
}
