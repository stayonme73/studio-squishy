/**
 * Combined Quality check for one Campaign Launch Kit.
 * Four channels share one brief. The usage guide is required and is not a channel.
 * A missing piece or a contradictory price fails closed.
 */

import { evaluateSquareCampaignComposition } from "@/lib/studio-design-renderer/social-promo-customer-package-qa";
import type { SquareCompositionLayer } from "@/lib/studio-design-renderer/social-promo-customer-package-qa";

import type { CampaignLaunchKitBrief } from "@/lib/studio-dispatch/campaign-launch-kit-brief";

const LEAK = /CERTIFICATION FIXTURE|INTERNAL TEST|\(CERT\)/i;
const MIN_PNG_BYTES = 8_000;
const PRICE_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g;

export type CampaignLaunchKitPackageQaResult =
  | { ok: true; summary: string; channels: 4 }
  | {
      ok: false;
      code: "PACKAGE_INCOMPLETE" | "FIXTURE_LEAKAGE" | "CONTRADICTORY_FACTS" | "SQUARE_COMPOSITION";
      message: string;
    };

export type CampaignLaunchKitPackageInspection = {
  brief: Pick<
    CampaignLaunchKitBrief,
    | "businessName"
    | "offerName"
    | "priceDisplay"
    | "wasPriceDisplay"
    | "dateWindow"
    | "cta"
    | "phone"
    | "webDisplay"
  >;
  emailText: string;
  smsText: string;
  usageGuideText: string;
  flyerText: string;
  flyerPngBytes: number;
  flyerPdfBytes: number;
  flyerPdfIsPdf: boolean;
  squarePngBytes: number;
  portraitPngBytes: number;
  squareLayers: readonly SquareCompositionLayer[];
};

function fail(
  code: Extract<CampaignLaunchKitPackageQaResult, { ok: false }>["code"],
  message: string,
): CampaignLaunchKitPackageQaResult {
  return { ok: false, code, message };
}

function amounts(text: string): string[] {
  return [...text.matchAll(PRICE_RE)].map((match) => match[0].replace(/\s+/g, ""));
}

function allowedPrices(brief: CampaignLaunchKitPackageInspection["brief"]): Set<string> {
  const allowed = new Set<string>([brief.priceDisplay.replace(/\s+/g, "")]);
  const was = brief.wasPriceDisplay?.match(PRICE_RE)?.[0]?.replace(/\s+/g, "");
  if (was) allowed.add(was);
  return allowed;
}

export function evaluateCampaignLaunchKitPackage(
  input: CampaignLaunchKitPackageInspection,
): CampaignLaunchKitPackageQaResult {
  const texts = [input.emailText, input.smsText, input.usageGuideText, input.flyerText];
  if (texts.some((text) => LEAK.test(text))) {
    return fail("FIXTURE_LEAKAGE", "Campaign package contains internal fixture language.");
  }
  if (input.flyerPngBytes < MIN_PNG_BYTES || input.squarePngBytes < MIN_PNG_BYTES || input.portraitPngBytes < MIN_PNG_BYTES) {
    return fail("PACKAGE_INCOMPLETE", "A campaign image is missing or too small to be a finished graphic.");
  }
  if (!input.flyerPdfIsPdf || input.flyerPdfBytes < 1000) {
    return fail("PACKAGE_INCOMPLETE", "The print-yourself PDF is missing.");
  }
  if (!input.emailText.includes("Email 1") || /Email 2/.test(input.emailText)) {
    return fail("PACKAGE_INCOMPLETE", "Campaign Launch Kit requires exactly one promotional email.");
  }
  if (!input.smsText.includes("Message 1") || !input.smsText.includes("Message 2") || /Message 3/.test(input.smsText)) {
    return fail("PACKAGE_INCOMPLETE", "Campaign Launch Kit requires exactly two text messages.");
  }
  if (!input.usageGuideText.includes("This guide is not a fifth channel.")) {
    return fail("PACKAGE_INCOMPLETE", "The usage guide is missing.");
  }
  if (!input.usageGuideText.includes("This is not a commercial 300-DPI print certification.")) {
    return fail("PACKAGE_INCOMPLETE", "The usage guide must say this is not a commercial print certification.");
  }
  if (!input.usageGuideText.includes("The Studio does not send the email or the text messages.")) {
    return fail("PACKAGE_INCOMPLETE", "The usage guide must say the Studio does not send the email or texts.");
  }

  const brief = input.brief;
  const shared = [input.emailText, input.smsText, input.flyerText, input.usageGuideText].join("\n");
  const required = [brief.businessName, brief.priceDisplay, brief.dateWindow, brief.cta];
  const missing = required.filter((token) => token && !shared.includes(token));
  if (missing.length > 0) {
    return fail(
      "PACKAGE_INCOMPLETE",
      `The campaign does not share these approved facts: ${missing.join(", ")}.`,
    );
  }
  if (!input.emailText.includes(brief.priceDisplay) || !input.smsText.includes(brief.priceDisplay)) {
    return fail("CONTRADICTORY_FACTS", "Email and text messages do not both carry the approved price.");
  }

  const allowed = allowedPrices(brief);
  for (const text of [input.emailText, input.smsText, input.flyerText]) {
    for (const amount of amounts(text)) {
      if (!allowed.has(amount)) {
        return fail(
          "CONTRADICTORY_FACTS",
          `Campaign copy states ${amount}, which is not the approved offer.`,
        );
      }
    }
  }

  const square = evaluateSquareCampaignComposition(input.squareLayers);
  if (!square.ok) return fail("SQUARE_COMPOSITION", square.message);

  return {
    ok: true,
    channels: 4,
    summary:
      "Four channels share the approved offer, price, dates, and call to action. The usage guide is included and is not a fifth channel.",
  };
}
