/**
 * Reusable product-representation gate.
 * Authorized product facts bind the visual production specification
 * used to create the photograph — not alt text written after render.
 */

export const PRODUCT_PACKAGE_TYPES = [
  "sealed_bags",
  "packaged_bags",
  "loose_bulk",
  "open_bag",
  "unpackaged",
] as const;

export type ProductPackageType = (typeof PRODUCT_PACKAGE_TYPES)[number];

export const PRODUCT_REPRESENTATION_VISUAL_FORMATS = [
  "social_square",
  "social_vertical",
  "print_counter_card",
  "short_vertical_video",
] as const;

export type ProductRepresentationVisualFormat =
  (typeof PRODUCT_REPRESENTATION_VISUAL_FORMATS)[number];

export type AuthorizedProductRepresentation = {
  unitCount: number;
  unitType: string;
  packageType: ProductPackageType;
  productDescription: string;
};

export type VisualProductionSpecification = {
  specId: string;
  visualUnitCount: number;
  visualUnitType: string;
  packageType: ProductPackageType;
  productDescription: string;
  /** Prompt actually used to create the visual. Required. Not post-render alt text. */
  generationPrompt: string;
  boundFormatIds: readonly ProductRepresentationVisualFormat[];
  forbiddenDepictions?: readonly string[];
};

export type ProductRepresentationFindingCode =
  | "unit_count_mismatch"
  | "package_type_mismatch"
  | "loose_bulk_substituted_for_packaged_bags"
  | "product_description_mismatch"
  | "visual_spec_unbound_from_product_facts"
  | "unauthorized_product_claim"
  | "post_render_alt_text_cannot_substitute";

export type ProductRepresentationFinding = {
  code: ProductRepresentationFindingCode;
  detail: string;
  expected?: string;
  actual?: string;
};

export type ProductRepresentationCheckInput = {
  authorized: AuthorizedProductRepresentation;
  visualSpec: VisualProductionSpecification;
  /**
   * Alt text after rendering is never enough. If the visual spec fails,
   * matching alt text does not pass the check.
   */
  postRenderAltText?: string;
  copySources?: readonly { sourceId: string; text: string }[];
  unauthorizedClaimPatterns?: readonly string[];
};

export type ProductRepresentationCheckResult = {
  ok: boolean;
  findings: ProductRepresentationFinding[];
};
