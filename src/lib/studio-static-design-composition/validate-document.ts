/**
 * Composition validation — the rules that make Maya's failure mode unreachable.
 *
 * These run on the document, before a single pixel is drawn, and they fail closed.
 * The legacy path could paint an empty offer plate and drop a customer's price
 * because nothing in the pipeline held it to either promise. These are those
 * promises, written as checks:
 *
 *   - every required fact is bound to exactly one element, verbatim
 *   - a container that declares it needs content actually gets content
 *   - a text element may only ask for a face the document carries
 *   - a crop window needs a source with room to crop
 *   - nothing is composed outside the canvas
 */

import { studioStaticDesignCompositionV1 as cfg } from "@/config/studio-static-design-composition-v1";

import { declaredFamilies } from "./fonts";
import { applyPresentationCase } from "./presentation-case";
import type {
  StudioDesignDocument,
  StudioDesignElement,
  StudioFigureElement,
  StudioTextElement,
} from "./types";

export type CompositionFailure = { code: string; message: string };

/**
 * A crop-headroom shortfall someone authorised. Not a pass and not a failure — a
 * standing note attached to the artifact, so "we accepted 181 ppi once, for a
 * proof" can never quietly become the print standard.
 */
export type PrintResolutionException = {
  elementId: string;
  label: string;
  scope: string;
  authorisedBy: string;
  reason: string;
  measuredSourceScale: number;
  requiredSourceScale: number;
  effectivePpi: number;
  permittedForLaunchPrint: boolean;
  detail: string;
};

export type CompositionValidationResult = {
  ok: boolean;
  failures: readonly CompositionFailure[];
  /** Empty for anything that could be sold as print. */
  printResolutionExceptions: readonly PrintResolutionException[];
  measured: {
    elementCount: number;
    boundFactIds: readonly string[];
    satisfiedBySharedLine: readonly { factId: string; elementIds: readonly string[] }[];
    satisfiedWithinLine: readonly { factId: string; carrierElementId: string }[];
    containerFill: readonly {
      containerId: string;
      contentHeightShare: number;
      contentElementIds: readonly string[];
    }[];
  };
};

function textElements(doc: StudioDesignDocument): StudioTextElement[] {
  return doc.elements.filter(
    (element): element is StudioTextElement => element.type === "text",
  );
}

function containers(doc: StudioDesignDocument): StudioFigureElement[] {
  return doc.elements.filter(
    (element): element is StudioFigureElement => element.type === "figure",
  );
}

function overlapsHorizontally(a: StudioDesignElement, b: StudioDesignElement): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x;
}

/**
 * Content inside a container, measured as the share of the container's height that
 * carries something. A plate whose content covers a sliver of it is the hollow
 * card defect wearing a different label.
 *
 * Only what is drawn *on* the container counts — elements later in paint order.
 * The background the plate sits over is not its content, which is the whole point:
 * Maya's empty card was painted over a perfectly good visual and was still empty.
 */
export function containerContentHeightShare(
  doc: StudioDesignDocument,
  container: StudioFigureElement,
): { share: number; contentElementIds: string[] } {
  const top = container.y;
  const bottom = container.y + container.height;
  let coveredTop = Number.POSITIVE_INFINITY;
  let coveredBottom = Number.NEGATIVE_INFINITY;
  const contentElementIds: string[] = [];
  const containerIndex = doc.elements.findIndex(
    (element) => element.id === container.id,
  );

  for (const [index, element] of doc.elements.entries()) {
    if (index <= containerIndex) continue;
    if (element.type === "figure") continue; // a plate cannot fill another plate
    if (!overlapsHorizontally(element, container)) continue;
    const overlapTop = Math.max(element.y, top);
    const overlapBottom = Math.min(element.y + element.height, bottom);
    if (overlapBottom <= overlapTop) continue;
    contentElementIds.push(element.id);
    coveredTop = Math.min(coveredTop, overlapTop);
    coveredBottom = Math.max(coveredBottom, overlapBottom);
  }

  if (!Number.isFinite(coveredTop) || coveredBottom <= coveredTop) {
    return { share: 0, contentElementIds };
  }
  return {
    share: (coveredBottom - coveredTop) / Math.max(1, container.height),
    contentElementIds,
  };
}

/**
 * `sourceDimensions` is optional so composition can be validated without touching
 * the filesystem. When supplied, crop headroom is enforced for real.
 */
export function validateDesignDocument(input: {
  document: StudioDesignDocument;
  /** Fact id -> value, from the truth contract. */
  factValues: Readonly<Record<string, string>>;
  sourceDimensions?: Readonly<Record<string, { width: number; height: number }>>;
}): CompositionValidationResult {
  const doc = input.document;
  const failures: CompositionFailure[] = [];
  const printResolutionExceptions: PrintResolutionException[] = [];
  const codes = cfg.failureCodes;
  const texts = textElements(doc);

  // --- facts are bound, verbatim, exactly once -----------------------------
  const byFact = new Map<string, StudioTextElement[]>();
  for (const element of texts) {
    byFact.set(element.factId, [...(byFact.get(element.factId) ?? []), element]);
  }

  /**
   * What the sheet actually says, indexed by the words. Two facts can legitimately
   * hold the same words — after this revision the truth mapper sets `headline` to the
   * CTA — and one line then satisfies both. Printing it twice would not be
   * composition, so the test is whether the words reach the artifact, not whether
   * each id has its own element.
   */
  const normalise = (value: string) => value.trim().toLowerCase();
  const wordsOnSheet = new Map<string, string[]>();
  for (const element of texts) {
    const value = String(input.factValues[element.factId] ?? "").trim();
    if (!value) continue;
    const key = normalise(value);
    wordsOnSheet.set(key, [...(wordsOnSheet.get(key) ?? []), element.id]);
  }

  const satisfiedBySharedLine: { factId: string; elementIds: readonly string[] }[] = [];
  const satisfiedWithinLine: { factId: string; carrierElementId: string }[] = [];
  for (const factId of cfg.requiredFactIds) {
    const value = String(input.factValues[factId] ?? "").trim();
    const bound = byFact.get(factId) ?? [];
    if (!value) {
      // A fact the customer never supplied is not a composition failure. Inventing
      // one would be. Absence is reported by the intake gate, not here.
      continue;
    }
    const carriers = wordsOnSheet.get(normalise(value)) ?? [];
    if (carriers.length === 0) {
      /**
       * A required fact can legitimately sit inside a longer line the customer
       * wrote that way — "3-hour home organizing session — $225" carries the price.
       * Splitting that line to give the price its own element would drop the
       * customer's punctuation and print the price twice, so containment counts.
       * The fact still has to be on the sheet verbatim; it just does not have to be
       * alone.
       */
      const carrier = texts.find(
        (element) =>
          element.factId !== factId &&
          normalise(element.text).includes(normalise(value)),
      );
      if (carrier) {
        satisfiedWithinLine.push({ factId, carrierElementId: carrier.id });
        continue;
      }
      failures.push({
        code: codes.requiredFactMissing,
        message: `Required customer fact "${factId}" (${value}) is not carried by any element. It would be silently dropped from the artifact.`,
      });
      continue;
    }
    if (bound.length === 0) {
      satisfiedBySharedLine.push({ factId, elementIds: carriers });
      continue;
    }
    if (bound.length > 1) {
      failures.push({
        code: codes.factBoundTwice,
        message: `Customer fact "${factId}" is bound to ${bound.length} elements (${bound
          .map((element) => element.id)
          .join(", ")}). One fact, one role.`,
      });
    }
  }

  for (const element of texts) {
    const value = String(input.factValues[element.factId] ?? "");
    if (!value) continue;
    const expected = applyPresentationCase(value, element.presentationCase);
    if (element.text.trim() !== expected.trim()) {
      failures.push({
        code: codes.factTextAltered,
        message: `Element ${element.id} prints "${element.text}" for fact "${element.factId}", which is not the customer's value "${value}". Facts are placed, not rewritten.`,
      });
    }
  }

  // --- containers that promise content must receive it ---------------------
  const canvasArea = doc.logical.widthPx * doc.logical.heightPx;
  const containerFill: {
    containerId: string;
    contentHeightShare: number;
    contentElementIds: readonly string[];
  }[] = [];
  for (const container of containers(doc)) {
    const share = container.width * container.height / Math.max(1, canvasArea);
    const { share: contentShare, contentElementIds } = containerContentHeightShare(
      doc,
      container,
    );
    containerFill.push({
      containerId: container.id,
      contentHeightShare: Number(contentShare.toFixed(4)),
      contentElementIds,
    });
    if (share < cfg.hollowContainer.minShareRequiringContent) continue;
    if (!container.requiresContent) {
      if (!container.decorativePurpose) {
        failures.push({
          code: codes.hollowContainer,
          message: `Container ${container.id} covers ${(share * 100).toFixed(1)}% of the canvas, carries no content, and states no decorative purpose. An unexplained painted field is not composition.`,
        });
      }
      continue;
    }
    if (contentShare < cfg.hollowContainer.minContentHeightShare) {
      failures.push({
        code: codes.hollowContainer,
        message: `Container ${container.id} declares it carries content but only ${(contentShare * 100).toFixed(1)}% of its height is filled (floor ${(cfg.hollowContainer.minContentHeightShare * 100).toFixed(0)}%). This is the hollow offer panel.`,
      });
    }
  }

  // --- fonts travel with the document -------------------------------------
  const families = declaredFamilies(doc.fonts);
  for (const element of texts) {
    if (!families.has(element.fontFamily)) {
      failures.push({
        code: codes.fontNotDeclared,
        message: `Element ${element.id} asks for "${element.fontFamily}", which the document does not carry. The renderer would have to substitute a face.`,
      });
      continue;
    }
    const weightAvailable = doc.fonts.some(
      (font) => font.family === element.fontFamily && font.weight === element.fontWeight,
    );
    if (!weightAvailable) {
      failures.push({
        code: codes.fontNotDeclared,
        message: `Element ${element.id} asks for ${element.fontFamily} ${element.fontWeight}, which the document does not carry. A synthesised weight is a substitution.`,
      });
    }
  }

  // --- geometry ------------------------------------------------------------
  for (const element of doc.elements) {
    const outside =
      element.x < 0 ||
      element.y < 0 ||
      element.x + element.width > doc.logical.widthPx ||
      element.y + element.height > doc.logical.heightPx;
    if (outside) {
      failures.push({
        code: codes.elementOutsideCanvas,
        message: `Element ${element.id} is composed outside the canvas (${element.x},${element.y} ${element.width}x${element.height} on ${doc.logical.widthPx}x${doc.logical.heightPx}).`,
      });
    }
  }

  // --- a crop window needs somewhere to crop from --------------------------
  const printScale =
    (doc.print.dpi * doc.print.referenceSheetHeightIn) / Math.max(1, doc.logical.heightPx);
  if (input.sourceDimensions) {
    for (const element of doc.elements) {
      if (element.type !== "image") continue;
      if (!element.focal && !element.crop) continue;
      const source = input.sourceDimensions[element.materialId];
      if (!source) {
        failures.push({
          code: codes.cropWithoutHeadroom,
          message: `Element ${element.id} requests a focal crop but material "${element.materialId}" has no known dimensions.`,
        });
        continue;
      }
      // Headroom is judged against the box at final output resolution, not against
      // the logical box. This is the measurement that caught the real defect: the
      // hero was generated at exactly the logical canvas size, so at 300 DPI it had
      // to be scaled up and there was nothing to crop.
      const needed = cfg.cropHeadroom.minimumSourceScale;
      const printBoxWidth = element.width * printScale;
      const printBoxHeight = element.height * printScale;
      const widthRatio = source.width / Math.max(1, printBoxWidth);
      const heightRatio = source.height / Math.max(1, printBoxHeight);
      /**
       * Which axis governs depends on the fit, and taking the wrong one flatters a
       * shortfall. `cover` scales until the box is filled, so the *tighter* axis is
       * the one every pixel is stretched by; `contain` scales until the image fits,
       * so the looser axis governs. This read `Math.max` unconditionally and
       * reported the hero at 0.80x when `cover` was really working at 0.60x.
       */
      const scale =
        element.fit === "cover"
          ? Math.min(widthRatio, heightRatio)
          : Math.max(widthRatio, heightRatio);
      if (scale < needed) {
        const exemption = element.printResolutionException;
        const authorised =
          exemption != null &&
          cfg.printResolutionException.allowedScopes.includes(exemption.scope) &&
          exemption.authorisedBy.trim().length > 0 &&
          exemption.reason.trim().length > 0;
        const shortfall = `source is ${source.width}x${source.height} against a ${Math.round(printBoxWidth)}x${Math.round(printBoxHeight)} box at ${doc.print.dpi} DPI — ${scale.toFixed(2)}x, under the ${needed}x headroom a crop needs`;
        if (!authorised) {
          failures.push({
            code: codes.cropWithoutHeadroom,
            message: `Element ${element.id} requests a focal point, but its ${shortfall}. Moving the focal point would change nothing.`,
          });
          continue;
        }
        /**
         * Authorised, and therefore recorded rather than forgiven. The measurement
         * is kept in full so the shortfall travels with the artifact instead of
         * living in whoever remembers approving it.
         */
        printResolutionExceptions.push({
          elementId: element.id,
          label: cfg.printResolutionException.label,
          scope: exemption.scope,
          authorisedBy: exemption.authorisedBy,
          reason: exemption.reason,
          measuredSourceScale: Number(scale.toFixed(4)),
          requiredSourceScale: needed,
          effectivePpi: Math.round(scale * doc.print.dpi),
          permittedForLaunchPrint:
            cfg.printResolutionException.permittedForLaunchPrint,
          detail: shortfall,
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    printResolutionExceptions,
    measured: {
      elementCount: doc.elements.length,
      boundFactIds: [...byFact.keys()].sort(),
      /** Facts whose words are on the sheet under another fact's binding. */
      satisfiedBySharedLine,
      /** Facts carried verbatim inside a longer line the customer supplied. */
      satisfiedWithinLine,
      containerFill,
    },
  };
}
