/**
 * Every sellable Studio product must have an explicit input/output contract.
 * Customers must not infer what they provide or what they receive.
 */

export const STUDIO_PRODUCT_INPUT_OUTPUT_CONTRACT_PACKAGE_ID =
  "STUDIO-PRODUCT-INPUT-OUTPUT-CONTRACT-1" as const;

export const PRODUCT_INPUT_OUTPUT_CONTRACT_SECTIONS = [
  "youProvide",
  "studioDelivers",
  "whatsIncluded",
  "whatsNotIncluded",
] as const;

export type ProductInputOutputContractSection =
  (typeof PRODUCT_INPUT_OUTPUT_CONTRACT_SECTIONS)[number];

export type ProductInputOutputContract = {
  skuId: string;
  customerFacingName: string;
  priceCents: number;
  youProvide: readonly string[];
  studioDelivers: readonly string[];
  whatsIncluded: readonly string[];
  whatsNotIncluded: readonly string[];
  important?: string;
  surfaces: {
    productCardShort: true;
    checkoutIntakeBeforePayment: true;
    helpCenterFull: true;
  };
};

export const studioProductInputOutputContractV1 = {
  packageId: STUDIO_PRODUCT_INPUT_OUTPUT_CONTRACT_PACKAGE_ID,
  authorizedAt: "2026-09-27" as const,
  requiredForEverySellableProduct: true as const,
  requiredForFutureMenuWork: true as const,
  customersMustNotInferScope: true as const,
  fourSectionsRequired: PRODUCT_INPUT_OUTPUT_CONTRACT_SECTIONS,
  requiredSurfaces: [
    "product_card_or_learn_more",
    "checkout_or_intake_before_payment",
    "help_center_full",
  ] as const,
  doNotRelyOnMarketingCopyAlone: true as const,
  doNotImplementUnrelatedMenuWorkFromThisRule: true as const,
} as const;

export function assertProductInputOutputContract(
  contract: ProductInputOutputContract,
): string[] {
  const findings: string[] = [];
  if (!contract.skuId.trim()) findings.push("sku_missing");
  if (!contract.customerFacingName.trim()) findings.push("name_missing");
  if (contract.priceCents <= 0) findings.push("price_missing");
  for (const section of PRODUCT_INPUT_OUTPUT_CONTRACT_SECTIONS) {
    if (!contract[section].length) findings.push(`${section}_empty`);
  }
  return findings;
}
