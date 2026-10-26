/**
 * Menu exact-fact gate.
 * Studio typesets customer wording. It does not invent, improve, or certify
 * allergens, ingredients, prices, or legal disclaimers.
 * Missing or ambiguous facts wait for the customer — not Owner rescue.
 */

export type MenuExactFactItem = {
  name: string;
  priceDisplay: string;
  description?: string;
};

export type MenuExactFactResult =
  | { ok: true; path: "PROCEED" }
  | {
      ok: false;
      code: "MISSING_REQUIRED_TRUTH" | "AMBIGUOUS_CUSTOMER_FACT";
      message: string;
      path: "WAIT_FOR_CUSTOMER";
    };

const AMBIGUOUS_FACT =
  /\b(tbd|tba|todo|lorem ipsum|placeholder|we think|probably|maybe|might contain|not sure|approx(?:imately)?|or so|\?\?\?)\b/i;

function isAmbiguous(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^\[.*\]$/.test(trimmed)) return true;
  if (/^xxx+$/i.test(trimmed)) return true;
  return AMBIGUOUS_FACT.test(trimmed);
}

function wait(
  code: Extract<MenuExactFactResult, { ok: false }>["code"],
  message: string,
): Extract<MenuExactFactResult, { ok: false }> {
  return { ok: false, code, message, path: "WAIT_FOR_CUSTOMER" };
}

export function evaluateMenuExactFacts(input: {
  dietaryLabels?: string;
  legalDisclaimer?: string;
  items?: readonly MenuExactFactItem[];
}): MenuExactFactResult {
  const dietary = input.dietaryLabels?.trim() ?? "";
  if (!dietary) {
    return wait(
      "MISSING_REQUIRED_TRUTH",
      "Dietary/allergen wording is required. Wait for the customer. Do not invent it.",
    );
  }
  if (isAmbiguous(dietary)) {
    return wait(
      "AMBIGUOUS_CUSTOMER_FACT",
      "Dietary/allergen wording is ambiguous. Wait for the customer. Do not invent or improve it.",
    );
  }

  const legal = input.legalDisclaimer?.trim() ?? "";
  if (legal && isAmbiguous(legal)) {
    return wait(
      "AMBIGUOUS_CUSTOMER_FACT",
      "Legal disclaimer wording is ambiguous. Wait for the customer. Do not invent or improve it.",
    );
  }

  for (const item of input.items ?? []) {
    if (!item.name?.trim() || !item.priceDisplay?.trim()) {
      return wait(
        "MISSING_REQUIRED_TRUTH",
        "A menu item is missing its name or price. Wait for the customer. Do not invent it.",
      );
    }
    if (
      isAmbiguous(item.name) ||
      isAmbiguous(item.priceDisplay) ||
      (item.description ? isAmbiguous(item.description) : false)
    ) {
      return wait(
        "AMBIGUOUS_CUSTOMER_FACT",
        `Menu item "${item.name.trim() || "(unnamed)"}" has ambiguous wording. Wait for the customer. Do not invent or improve it.`,
      );
    }
  }

  return { ok: true, path: "PROCEED" };
}
