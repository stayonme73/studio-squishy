/**
 * What an artifact *says*, as opposed to how it looks.
 *
 * `fingerprintDesignSpec` binds a whole spec: geometry, palette, layout family,
 * creative direction. That is the right identity for "may these exact pixels be
 * served from cache", and the wrong one for "has this customer's request already
 * been produced". Two artifacts can carry byte-identical customer facts and
 * fingerprint differently because a correction narrowed the composition or the
 * variety selector picked another layout family.
 *
 * Spend authority needs the second question. A fact signature is the projection of
 * a spec down to what a customer would notice were wrong: the exact fact-bearing
 * text the renderer will place, the approved materials it will place, the SKU, and
 * the canvas those are laid out on. Everything a correction brief, a loop
 * constraint, or the variety selector is allowed to move is excluded.
 *
 * This is what lets an artifact produced before request keys existed still be
 * recognised as satisfying the request it was produced for. Its stored spec is on
 * disk and immutable, so the facts it carries can be read back and compared
 * directly — no reconstructing a historical key, and no dependence on which layout
 * family happened to be chosen the day it was built.
 */

import { sha256Bytes } from "./bind";
import type { FlyerDesignSpec, FlyerProjectTruth, FlyerTextRole } from "./types";

/**
 * The material the image model produced. It is a rendering of the request, not a
 * fact of it — the same request generates a different visual every attempt — so it
 * is excluded from the facts an artifact is measured against. Excluding it is also
 * what allows a hybrid artifact and a renderer-only artifact carrying the same
 * customer facts to be compared at all.
 */
const GENERATED_VISUAL_MATERIAL_ID = "hybrid-generated-visual";

/** The layer a hybrid composition places the generated visual into. */
const GENERATED_HERO_LAYER_ID = "generated-hero";

/**
 * Whether this spec was built by the hybrid route.
 *
 * Read from the artifact's own stored spec, so it reports the method that actually
 * produced it rather than the method the Machine would choose today. A renderer-only
 * artifact does not satisfy a hybrid request even when both carry the same facts:
 * the generated visual layer is part of what the customer bought.
 */
export function specCarriesGeneratedVisual(spec: FlyerDesignSpec): boolean {
  return spec.layers.some((layer) => layer.id === GENERATED_HERO_LAYER_ID);
}

/**
 * Which text roles carry customer facts.
 *
 * Declared as a total map over `FlyerTextRole` rather than a list, so adding a role
 * to the renderer fails to compile until someone decides whether it is a fact. A
 * denylist would let a new decorative role leak into spend authority silently.
 *
 * `eyebrow` is the one exclusion and it is deliberate. The only flyer layout that
 * emits one builds it as `truth.wordmark.slice(0, 1).toUpperCase()` — a drop-cap
 * flourish derived from a fact the `wordmark` layer already carries in full
 * (`studio-design-intelligence/layouts.ts`, the `field-mark` layer). Because only
 * some layout families draw it, including it would make an unchanged request look
 * changed the moment the variety selector picked a different family, which is the
 * exact failure this projection exists to prevent. Excluding it discards no
 * customer information.
 */
const FACT_BEARING_TEXT_ROLES: Record<FlyerTextRole, boolean> = {
  wordmark: true,
  descriptor: true,
  headline: true,
  offer: true,
  price: true,
  dates: true,
  body: true,
  cta: true,
  contact_phone: true,
  contact_web: true,
  was_price: true,
  disclaimer: true,
  eyebrow: false,
};

export function isFactBearingTextRole(role: FlyerTextRole): boolean {
  return FACT_BEARING_TEXT_ROLES[role] === true;
}

/**
 * Collapse the whitespace differences a layout engine is entitled to introduce
 * while leaving every character a customer would read intact.
 */
function normalizeFactText(content: string): string {
  return content.replace(/\s+/g, " ").trim();
}

export type DesignFactProjection = {
  skuId: string;
  canvas: { widthPx: number; heightPx: number };
  /** Every fact-bearing string the artifact places, sorted, deduplicated. */
  text: readonly string[];
  /** Approved customer materials, excluding anything the machine generated. */
  materials: readonly string[];
};

/**
 * The customer-facing content of a spec, in a form two specs can be compared in.
 *
 * Text is compared as a set of strings rather than a role-keyed map on purpose.
 * Layout families are free to carry the same fact in a different role — a price can
 * be an `offer` line in one family and a `price` medallion in another — and that is
 * a styling decision, not a change to what the flyer tells the customer. Sorting
 * and deduplicating makes the projection independent of layer order.
 */
export function projectDesignFacts(spec: FlyerDesignSpec): DesignFactProjection {
  const text = [
    ...new Set(
      spec.layers
        .filter((layer) => layer.type === "text" && isFactBearingTextRole(layer.role))
        .map((layer) => normalizeFactText((layer as { content: string }).content))
        .filter((content) => content.length > 0),
    ),
  ].sort();

  const materials = spec.materials
    .filter((material) => material.materialId !== GENERATED_VISUAL_MATERIAL_ID)
    .map((material) => `${material.materialId}:${material.contentSha256}`)
    .sort();

  return {
    skuId: spec.skuId,
    canvas: { widthPx: spec.canvas.widthPx, heightPx: spec.canvas.heightPx },
    text,
    materials,
  };
}

/**
 * A fixed styling choice, used only to work out which facts a request asks for.
 *
 * The facts a flyer carries have to be read off a spec, and producing a spec means
 * choosing a layout. Dropping the creative direction entirely does not avoid the
 * choice — it falls back to the pre-intelligence family, which composes facts
 * differently: it inlines the price into the offer line (`"Wheel-throwing seats for
 * $35"`) where every current family keeps them apart (`"Wheel-throwing seats"` plus
 * `"$35"`). Projected that way, no artifact built by a current family ever matches
 * its own request, and the comparison is worthless exactly where it is needed.
 *
 * So the direction is pinned instead of removed. Current families agree on what the
 * facts *are* and disagree only on how they are arranged, which the projection
 * already discards — so any one of them can stand for all of them, as long as it is
 * always the same one. Pinning it is what keeps the variety selector, and the global
 * render history it reads, out of the answer.
 */
const FACT_PROJECTION_ROUTE = {
  routeId: "fact-projection",
  label: "Fact projection",
  layoutFamilyId: "modular_thirds",
  paletteFamilyId: "graphite_paper",
  typeSystemId: "grotesque_sans",
  geometryId: "thirds_dock",
  rationale:
    "Fixed route used only to read a request's facts. Never rendered for a customer.",
} as const;

/**
 * The request as a spec whose facts can be compared, with variety pinned.
 *
 * A job with no creative direction at all is left alone: it was built by the
 * pre-intelligence family and its artifacts compose facts that way, so projecting it
 * through a current family would compare it against something it never was.
 */
export function factProjectionTruth(truth: FlyerProjectTruth): FlyerProjectTruth {
  if (!truth.creativeDirection) return truth;
  return {
    ...truth,
    creativeDirection: {
      ...truth.creativeDirection,
      selectedRoute: {
        ...truth.creativeDirection.selectedRoute,
        ...FACT_PROJECTION_ROUTE,
      },
      candidateRoutes: [],
    },
  };
}

/**
 * A stable hash of what an artifact tells the customer.
 *
 * Stable across: correction briefs, loop constraints, layout family, palette,
 * geometry, typography, creative direction, the generated visual layer, layer
 * order, and whitespace.
 *
 * Changes when: any fact-bearing string changes, an approved material's bytes
 * change, a material is added or removed, the SKU changes, or the canvas changes.
 */
export function designFactSignature(spec: FlyerDesignSpec): string {
  return sha256Bytes(JSON.stringify(projectDesignFacts(spec)));
}
