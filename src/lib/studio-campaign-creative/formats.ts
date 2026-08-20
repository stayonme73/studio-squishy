import type { CampaignFormatId } from "./contracts";

/**
 * Print-handout contracts are versioned so Room 4B sealed replay stays on
 * the historical canvas while Cedar Lane / future Letter jobs use US Letter.
 * Do not replace v1 in place. Resolve by explicit contract id.
 */

export const CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1 = {
  contractId: "campaign-print-handout-v1" as const,
  widthPx: 1024,
  heightPx: 1536,
} as const;

export const CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER = {
  contractId: "campaign-print-handout-v2-us-letter" as const,
  widthPx: 2550,
  heightPx: 3300,
  pdfPage: {
    width: "8.5in" as const,
    height: "11in" as const,
    widthPt: 612,
    heightPt: 792,
  },
} as const;

export type CampaignPrintHandoutContractId =
  | typeof CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1.contractId
  | typeof CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER.contractId;

export type CampaignPrintHandoutContract =
  | typeof CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1
  | typeof CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER;

export const CAMPAIGN_PRINT_HANDOUT_CONTRACTS = {
  [CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1.contractId]:
    CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1,
  [CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER.contractId]:
    CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER,
} as const;

export const DEFAULT_PRINT_HANDOUT_CONTRACT_ID =
  CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1.contractId;

export function resolvePrintHandoutContract(
  contractId?: CampaignPrintHandoutContractId | string,
): CampaignPrintHandoutContract {
  if (contractId == null || contractId === "") {
    return CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1;
  }
  const found =
    CAMPAIGN_PRINT_HANDOUT_CONTRACTS[
      contractId as CampaignPrintHandoutContractId
    ];
  if (!found) {
    throw new Error(`UNKNOWN_PRINT_HANDOUT_CONTRACT:${contractId}`);
  }
  return found;
}

/** Historical default canvas (Room 4B). Letter is contract v2, not this map. */
export const CAMPAIGN_FORMAT_CANVASES = {
  social_square: { widthPx: 1080, heightPx: 1080 },
  social_vertical: { widthPx: 1080, heightPx: 1920 },
  print_handout: {
    widthPx: CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1.widthPx,
    heightPx: CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1.heightPx,
  },
} as const satisfies Record<
  CampaignFormatId,
  { widthPx: number; heightPx: number }
>;

export const CAMPAIGN_FORMAT_ORDER: readonly CampaignFormatId[] = [
  "social_square",
  "social_vertical",
  "print_handout",
] as const;

/** @deprecated Use CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER */
export const US_LETTER_300DPI = {
  widthPx: CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER.widthPx,
  heightPx: CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER.heightPx,
} as const;

/** @deprecated Use CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER.pdfPage */
export const US_LETTER_PAGE = {
  widthIn: 8.5,
  heightIn: 11,
  widthPt: 612,
  heightPt: 792,
} as const;
