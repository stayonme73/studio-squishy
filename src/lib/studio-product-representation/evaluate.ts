import type {
  AuthorizedProductRepresentation,
  ProductPackageType,
  ProductRepresentationCheckInput,
  ProductRepresentationCheckResult,
  ProductRepresentationFinding,
  VisualProductionSpecification,
} from "./types";

const PACKAGED_TYPES = new Set<ProductPackageType>([
  "sealed_bags",
  "packaged_bags",
]);

const LOOSE_TYPES = new Set<ProductPackageType>([
  "loose_bulk",
  "open_bag",
  "unpackaged",
]);

const COUNT_WORDS: Record<number, readonly string[]> = {
  1: ["one", "a single", "1"],
  2: ["two", "2"],
  3: ["three", "3"],
  4: ["four", "4"],
};

function push(
  findings: ProductRepresentationFinding[],
  finding: ProductRepresentationFinding,
): void {
  findings.push(finding);
}

function countTokens(count: number): readonly string[] {
  return COUNT_WORDS[count] ?? [String(count)];
}

function includesCountToken(text: string, count: number): boolean {
  const lower = text.toLowerCase();
  return countTokens(count).some((token) => lower.includes(token));
}

function isPackagedLabel(label: string): boolean {
  return /\b(sealed|packaged)\b/i.test(label) && /\bbags?\b/i.test(label);
}

function isLooseLabel(label: string): boolean {
  return (
    /loose bulk/i.test(label) ||
    /open bag/i.test(label) ||
    /unpackaged/i.test(label) ||
    /loose (coffee|beans)/i.test(label)
  );
}

export function packagedTypesCompatible(
  authorized: ProductPackageType,
  visual: ProductPackageType,
): boolean {
  if (PACKAGED_TYPES.has(authorized)) {
    return PACKAGED_TYPES.has(visual);
  }
  return authorized === visual;
}

export function buildPackagedUnitVisualPrompt(input: {
  productName: string;
  unitCount: number;
  unitType: string;
  visualUnitType: string;
  stylingNotes: string;
}): string {
  const countWord = countTokens(input.unitCount)[0] ?? String(input.unitCount);
  return [
    `Warm seasonal commercial product photograph of ${input.productName}.`,
    `The product in the photograph is exactly ${countWord} ${input.unitType}, shown as ${input.visualUnitType}.`,
    `All ${countWord} packaged bags stand clearly visible so a customer can count ${countWord} separate bags.`,
    "Do not show a single open sack of loose beans as the product.",
    "Do not substitute loose bulk coffee for packaged bags.",
    input.stylingNotes,
  ].join(" ");
}

function descriptionAgreesWithAuthorized(
  authorized: AuthorizedProductRepresentation,
): ProductRepresentationFinding[] {
  const findings: ProductRepresentationFinding[] = [];
  if (!includesCountToken(authorized.productDescription, authorized.unitCount)) {
    push(findings, {
      code: "product_description_mismatch",
      detail:
        "Authorized unit count does not agree with the product-description facts.",
      expected: String(authorized.unitCount),
      actual: authorized.productDescription,
    });
  }
  if (
    PACKAGED_TYPES.has(authorized.packageType) &&
    !/\bbags?\b/i.test(authorized.productDescription)
  ) {
    push(findings, {
      code: "product_description_mismatch",
      detail:
        "Authorized packaged unit type does not agree with the product-description facts.",
      expected: authorized.unitType,
      actual: authorized.productDescription,
    });
  }
  return findings;
}

function evaluateVisualBinding(
  authorized: AuthorizedProductRepresentation,
  visualSpec: VisualProductionSpecification,
  findings: ProductRepresentationFinding[],
): void {
  if (visualSpec.productDescription !== authorized.productDescription) {
    push(findings, {
      code: "product_description_mismatch",
      detail:
        "Visual production specification product description does not match authorized product facts.",
      expected: authorized.productDescription,
      actual: visualSpec.productDescription,
    });
  }

  if (visualSpec.visualUnitCount !== authorized.unitCount) {
    push(findings, {
      code: "unit_count_mismatch",
      detail: "Visual unit count does not match the authorized unit count.",
      expected: String(authorized.unitCount),
      actual: String(visualSpec.visualUnitCount),
    });
  }

  if (
    PACKAGED_TYPES.has(authorized.packageType) &&
    LOOSE_TYPES.has(visualSpec.packageType)
  ) {
    push(findings, {
      code: "loose_bulk_substituted_for_packaged_bags",
      detail:
        "Loose bulk or open-bag coffee cannot substitute for authorized packaged bags.",
      expected: authorized.unitType,
      actual: visualSpec.visualUnitType,
    });
  } else if (
    !packagedTypesCompatible(authorized.packageType, visualSpec.packageType)
  ) {
    push(findings, {
      code: "package_type_mismatch",
      detail: "Visual package type is not compatible with the authorized package type.",
      expected: authorized.packageType,
      actual: visualSpec.packageType,
    });
  }

  if (PACKAGED_TYPES.has(authorized.packageType) && isLooseLabel(visualSpec.visualUnitType)) {
    push(findings, {
      code: "loose_bulk_substituted_for_packaged_bags",
      detail:
        "Visual unit type describes loose bulk coffee instead of packaged bags.",
      expected: authorized.unitType,
      actual: visualSpec.visualUnitType,
    });
  }

  if (
    PACKAGED_TYPES.has(authorized.packageType) &&
    !isPackagedLabel(authorized.unitType)
  ) {
    push(findings, {
      code: "product_description_mismatch",
      detail: "Authorized unit type must describe sealed or packaged bags.",
      expected: "sealed or packaged bags",
      actual: authorized.unitType,
    });
  }

  if (
    PACKAGED_TYPES.has(visualSpec.packageType) &&
    !isPackagedLabel(visualSpec.visualUnitType)
  ) {
    push(findings, {
      code: "package_type_mismatch",
      detail: "Visual unit type must describe packaged coffee bags.",
      expected: "packaged coffee bags",
      actual: visualSpec.visualUnitType,
    });
  }

  const prompt = visualSpec.generationPrompt.trim();
  if (!prompt) {
    push(findings, {
      code: "visual_spec_unbound_from_product_facts",
      detail:
        "Visual production specification is missing the generation prompt used to create the visual.",
    });
    return;
  }

  if (!includesCountToken(prompt, authorized.unitCount)) {
    push(findings, {
      code: "visual_spec_unbound_from_product_facts",
      detail:
        "Generation prompt does not bind the authorized unit count before render.",
      expected: String(authorized.unitCount),
    });
  }

  if (
    PACKAGED_TYPES.has(authorized.packageType) &&
    (!/\b(sealed|packaged)\b/i.test(prompt) || !/\bbags?\b/i.test(prompt))
  ) {
    push(findings, {
      code: "visual_spec_unbound_from_product_facts",
      detail:
        "Generation prompt does not bind sealed or packaged bags before render.",
      expected: authorized.unitType,
    });
  }

  for (const forbidden of visualSpec.forbiddenDepictions ?? []) {
    if (forbidden && prompt.toLowerCase().includes(forbidden.toLowerCase())) {
      const negated = new RegExp(
        String.raw`do not[^.]*${forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "i",
      );
      if (!negated.test(prompt)) {
        push(findings, {
          code: "unauthorized_product_claim",
          detail: "Generation prompt depicts a forbidden product representation.",
          actual: forbidden,
        });
      }
    }
  }
}

export function formatProductRepresentationFailure(
  result: ProductRepresentationCheckResult,
): string {
  return result.findings
    .map((finding) =>
      [finding.code, finding.expected, finding.actual]
        .filter((part) => part != null && part !== "")
        .join(":"),
    )
    .join("|");
}

export function evaluateProductRepresentation(
  input: ProductRepresentationCheckInput,
): ProductRepresentationCheckResult {
  const findings: ProductRepresentationFinding[] = [];
  findings.push(...descriptionAgreesWithAuthorized(input.authorized));
  evaluateVisualBinding(input.authorized, input.visualSpec, findings);

  if (
    input.postRenderAltText &&
    findings.some(
      (finding) =>
        finding.code === "unit_count_mismatch" ||
        finding.code === "loose_bulk_substituted_for_packaged_bags" ||
        finding.code === "package_type_mismatch",
    )
  ) {
    push(findings, {
      code: "post_render_alt_text_cannot_substitute",
      detail:
        "Post-render alt text cannot substitute for a visual production specification that disagrees with authorized product facts.",
      actual: input.postRenderAltText,
    });
  }

  const claimPatterns = input.unauthorizedClaimPatterns ?? [];
  for (const source of input.copySources ?? []) {
    for (const pattern of claimPatterns) {
      if (pattern && new RegExp(pattern, "i").test(source.text)) {
        push(findings, {
          code: "unauthorized_product_claim",
          detail: `${source.sourceId} contains an unauthorized product claim.`,
          actual: pattern,
        });
      }
    }
  }

  return { ok: findings.length === 0, findings };
}

export function assertProductRepresentation(
  input: ProductRepresentationCheckInput,
): void {
  const result = evaluateProductRepresentation(input);
  if (!result.ok) {
    throw new Error(
      `PRODUCT_REPRESENTATION:${formatProductRepresentationFailure(result)}`,
    );
  }
}
