/**
 * Authoritative service set vs rendered layers — completeness + pricing-mode truth.
 */

import type {
  ServiceSheetDesignSpec,
  ServiceSheetProjectTruth,
} from "./service-sheet-types";

export type ServiceSheetCompletenessResult =
  | { ok: true; serviceCount: number }
  | { ok: false; message: string };

export function verifyServiceSheetCompletenessAndPrices(
  truth: ServiceSheetProjectTruth,
  spec: ServiceSheetDesignSpec,
  declaredText: string,
): ServiceSheetCompletenessResult {
  const authoritative = truth.services.map((s) => ({
    serviceId: s.serviceId,
    name: s.name.trim(),
    description: s.description?.trim() ?? "",
    priceMode: s.priceMode,
    price: s.priceDisplay?.trim() ?? "",
  }));

  const nameLayers = spec.layers.filter(
    (l) => l.type === "text" && l.role === "service_name",
  );
  const priceLayers = spec.layers.filter(
    (l) => l.type === "text" && l.role === "service_price",
  );
  const descLayers = spec.layers.filter(
    (l) => l.type === "text" && l.role === "service_description",
  );

  if (nameLayers.length !== authoritative.length) {
    return {
      ok: false,
      message: `Service name layer count ${nameLayers.length} !== authoritative ${authoritative.length}`,
    };
  }

  const expectedPriceCount = authoritative.filter(
    (s) => s.priceMode !== "omitted",
  ).length;
  if (priceLayers.length !== expectedPriceCount) {
    return {
      ok: false,
      message: `Price layer count ${priceLayers.length} !== expected ${expectedPriceCount} (omitted must have no price cell)`,
    };
  }

  const nameById = new Map(
    nameLayers
      .filter((l) => l.type === "text")
      .map((l) => [l.serviceId!, l.content.trim()] as const),
  );
  const priceById = new Map(
    priceLayers
      .filter((l) => l.type === "text")
      .map((l) => [l.serviceId!, l.content.trim()] as const),
  );
  const descById = new Map(
    descLayers
      .filter((l) => l.type === "text")
      .map((l) => [l.serviceId!, l.content.trim()] as const),
  );

  if (nameById.size !== authoritative.length) {
    return { ok: false, message: "Duplicate or missing service_name serviceId" };
  }

  for (const s of authoritative) {
    if (!nameById.has(s.serviceId)) {
      return { ok: false, message: `Omitted service ${s.serviceId}` };
    }
    if (nameById.get(s.serviceId) !== s.name) {
      return {
        ok: false,
        message: `Name mismatch ${s.serviceId}: rendered≠truth`,
      };
    }
    if (s.priceMode === "omitted") {
      if (priceById.has(s.serviceId)) {
        return {
          ok: false,
          message: `Omitted mode must not render price for ${s.serviceId}`,
        };
      }
    } else {
      if (priceById.get(s.serviceId) !== s.price) {
        return {
          ok: false,
          message: `Price mismatch ${s.serviceId}: "${priceById.get(s.serviceId)}"≠"${s.price}"`,
        };
      }
      if (!declaredText.includes(s.price)) {
        return {
          ok: false,
          message: `Declared text missing price/contact wording ${s.price}`,
        };
      }
    }
    if (s.description) {
      if (descById.get(s.serviceId) !== s.description) {
        return {
          ok: false,
          message: `Description mismatch or missing for ${s.serviceId}`,
        };
      }
    }
    if (!declaredText.includes(s.name)) {
      return {
        ok: false,
        message: `Declared text missing name ${s.name}`,
      };
    }
  }

  // Forbidden Machine fallbacks must not appear unless they are authoritative truth.
  const forbidden = [
    "Call for price",
    "Call for pricing",
    "TBD",
    "$—",
  ];
  for (const phrase of forbidden) {
    if (
      declaredText.includes(phrase) &&
      !authoritative.some((s) => s.price === phrase)
    ) {
      return {
        ok: false,
        message: `Invented pricing filler detected: ${phrase}`,
      };
    }
  }
  // “Contact for pricing” only when a contact_for_pricing row authorizes it.
  if (/contact for pricing/i.test(declaredText)) {
    const authorized = authoritative.some(
      (s) =>
        s.priceMode === "contact_for_pricing" &&
        /contact for pricing/i.test(s.price),
    );
    if (!authorized) {
      return {
        ok: false,
        message:
          "contact_for_pricing language appeared without customer-authorized truth",
      };
    }
  }

  if (!declaredText.includes(truth.contactDetails.trim())) {
    return { ok: false, message: "Contact details not preserved" };
  }
  if (!declaredText.includes(truth.legalDisclaimer.trim())) {
    return { ok: false, message: "Legal disclaimer not preserved" };
  }

  return { ok: true, serviceCount: authoritative.length };
}
