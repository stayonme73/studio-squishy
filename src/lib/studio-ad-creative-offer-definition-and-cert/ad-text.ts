import { studioAdCreativeOfferDefinitionAndCertV1 as pack } from "@/config/studio-ad-creative-offer-definition-and-cert-v1";
import { evaluateAdCreativeClaims, type AdCreativeIntake } from "./claims";

export type AdTextCard = {
  headline: string;
  primaryText: string;
  cta: string;
  disclosure: string;
  pasteReady: string;
};

export function assembleAdTextCard(
  intake: AdCreativeIntake,
  revision?: { headline?: string; cta?: string },
): { ok: true; card: AdTextCard } | { ok: false; message: string } {
  const working: AdCreativeIntake = {
    ...intake,
    headline: revision?.headline?.trim() || intake.headline,
    cta: revision?.cta?.trim() || intake.cta,
  };
  const claims = evaluateAdCreativeClaims(working);
  if (!claims.ok) return { ok: false, message: claims.message };

  const lines = [
    working.headline.trim(),
    "",
    working.primaryText.trim(),
    "",
    working.cta.trim(),
  ];
  if (working.priceDisplay.trim()) lines.push(working.priceDisplay.trim());
  if (working.phone?.trim()) lines.push(working.phone.trim());
  if (working.website?.trim()) lines.push(working.website.trim());
  if (working.requiredDisclosure?.trim()) lines.push(working.requiredDisclosure.trim());
  lines.push("");
  lines.push(pack.customerCopy.accountBoundary);

  return {
    ok: true,
    card: {
      headline: working.headline.trim(),
      primaryText: working.primaryText.trim(),
      cta: working.cta.trim(),
      disclosure: working.requiredDisclosure?.trim() ?? "",
      pasteReady: lines.join("\n"),
    },
  };
}
