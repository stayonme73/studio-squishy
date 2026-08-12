/**
 * Authoritative item set vs rendered item set — exact completeness + price truth.
 */

import type { MenuDesignSpec, MenuProjectTruth } from "./menu-types";

export type MenuCompletenessResult =
  | { ok: true; itemCount: number }
  | { ok: false; message: string };

export function verifyMenuItemCompletenessAndPrices(
  truth: MenuProjectTruth,
  spec: MenuDesignSpec,
  declaredText: string,
): MenuCompletenessResult {
  const authoritative = truth.sections.flatMap((s) =>
    s.items.map((it) => ({
      itemId: it.itemId,
      name: it.name.trim(),
      price: it.priceDisplay.trim(),
      description: it.description?.trim() ?? "",
      sectionId: s.sectionId,
    })),
  );

  const nameLayers = spec.layers.filter(
    (l) => l.type === "text" && l.role === "item_name",
  );
  const priceLayers = spec.layers.filter(
    (l) => l.type === "text" && l.role === "item_price",
  );
  const descLayers = spec.layers.filter(
    (l) => l.type === "text" && l.role === "item_description",
  );

  if (nameLayers.length !== authoritative.length) {
    return {
      ok: false,
      message: `Item name layer count ${nameLayers.length} !== authoritative ${authoritative.length}`,
    };
  }
  if (priceLayers.length !== authoritative.length) {
    return {
      ok: false,
      message: `Item price layer count ${priceLayers.length} !== authoritative ${authoritative.length}`,
    };
  }

  const nameById = new Map(
    nameLayers
      .filter((l) => l.type === "text")
      .map((l) => [l.itemId!, l.content.trim()] as const),
  );
  const priceById = new Map(
    priceLayers
      .filter((l) => l.type === "text")
      .map((l) => [l.itemId!, l.content.trim()] as const),
  );
  const descById = new Map(
    descLayers
      .filter((l) => l.type === "text")
      .map((l) => [l.itemId!, l.content.trim()] as const),
  );

  if (nameById.size !== authoritative.length) {
    return { ok: false, message: "Duplicate or missing item_name itemId" };
  }

  for (const it of authoritative) {
    if (!nameById.has(it.itemId)) {
      return { ok: false, message: `Omitted item ${it.itemId}` };
    }
    if (nameById.get(it.itemId) !== it.name) {
      return {
        ok: false,
        message: `Name mismatch ${it.itemId}: rendered≠truth`,
      };
    }
    if (priceById.get(it.itemId) !== it.price) {
      return {
        ok: false,
        message: `Price mismatch ${it.itemId}: "${priceById.get(it.itemId)}"≠"${it.price}"`,
      };
    }
    if (it.description) {
      if (descById.get(it.itemId) !== it.description) {
        return {
          ok: false,
          message: `Description mismatch or missing for ${it.itemId}`,
        };
      }
    }
    if (!declaredText.includes(it.name)) {
      return {
        ok: false,
        message: `Declared text missing name ${it.name}`,
      };
    }
    if (!declaredText.includes(it.price)) {
      return {
        ok: false,
        message: `Declared text missing price ${it.price}`,
      };
    }
  }

  for (const sec of truth.sections) {
    const titleLayer = spec.layers.find(
      (l) =>
        l.type === "text" &&
        l.role === "section_title" &&
        l.sectionId === sec.sectionId,
    );
    if (!titleLayer || titleLayer.type !== "text") {
      return { ok: false, message: `Missing section ${sec.sectionId}` };
    }
  }

  if (!declaredText.includes(truth.dietaryLabels.trim())) {
    return {
      ok: false,
      message: "Client dietary/allergen wording not preserved in declared text",
    };
  }
  if (
    truth.legalDisclaimer?.trim() &&
    !declaredText.includes(truth.legalDisclaimer.trim())
  ) {
    return {
      ok: false,
      message: "Client legal disclaimer not preserved in declared text",
    };
  }

  return { ok: true, itemCount: authoritative.length };
}
