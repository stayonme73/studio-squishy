/**
 * Business-card contact facts stay exact.
 * Missing or ambiguous wording waits for the customer — not Owner rescue.
 */

export type BusinessCardExactFactResult =
  | { ok: true; path: "PROCEED" }
  | {
      ok: false;
      code: "MISSING_REQUIRED_TRUTH" | "AMBIGUOUS_CUSTOMER_FACT" | "UNSUPPORTED_PLATE_CLAIM";
      message: string;
      path: "WAIT_FOR_CUSTOMER" | "FAIL_CLOSED";
    };

const AMBIGUOUS_FACT =
  /\b(tbd|tba|todo|lorem ipsum|placeholder|we think|probably|maybe|not sure|approx(?:imately)?|or so|\?\?\?)\b/i;

const PHYSICAL_PRINT_CLAIM =
  /3\s*[x×]\s*2|3\.5|300\s*dpi|bleed|cmyk|press[- ]ready/i;

function isAmbiguous(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^\[.*\]$/.test(trimmed)) return true;
  if (/^xxx+$/i.test(trimmed)) return true;
  return AMBIGUOUS_FACT.test(trimmed);
}

function wait(
  code: Extract<BusinessCardExactFactResult, { ok: false }>["code"],
  message: string,
  path: Extract<BusinessCardExactFactResult, { ok: false }>["path"] = "WAIT_FOR_CUSTOMER",
): Extract<BusinessCardExactFactResult, { ok: false }> {
  return { ok: false, code, message, path };
}

export function evaluateBusinessCardExactFacts(input: {
  businessName?: string;
  personName?: string;
  title?: string;
  phone?: string;
  email?: string;
  webDisplay?: string;
  address?: string;
  cardSize?: string;
}): BusinessCardExactFactResult {
  if (input.cardSize && PHYSICAL_PRINT_CLAIM.test(input.cardSize)) {
    return wait(
      "UNSUPPORTED_PLATE_CLAIM",
      "Physical-inch, 300 DPI, bleed, or CMYK claims are not sold on this card. Digital CERT 1536×1024 only.",
      "FAIL_CLOSED",
    );
  }

  const required = [
    ["businessName", input.businessName],
    ["personName", input.personName],
    ["phone", input.phone],
    ["email", input.email],
  ] as const;
  for (const [field, value] of required) {
    if (!value?.trim()) {
      return wait(
        "MISSING_REQUIRED_TRUTH",
        `${field} is required. Wait for the customer. Do not invent it.`,
      );
    }
    if (isAmbiguous(value)) {
      return wait(
        "AMBIGUOUS_CUSTOMER_FACT",
        `${field} is ambiguous. Wait for the customer. Do not invent or improve it.`,
      );
    }
  }

  for (const value of [input.title, input.webDisplay, input.address]) {
    if (value && isAmbiguous(value)) {
      return wait(
        "AMBIGUOUS_CUSTOMER_FACT",
        "Optional contact wording is ambiguous. Wait for the customer. Do not invent or improve it.",
      );
    }
  }

  return { ok: true, path: "PROCEED" };
}

export function businessCardDeclaredTextPreservesFacts(input: {
  declaredText: string;
  businessName: string;
  personName: string;
  phone: string;
  email: string;
}): boolean {
  const hay = input.declaredText;
  return (
    hay.includes(input.businessName.trim()) &&
    hay.includes(input.personName.trim()) &&
    hay.includes(input.phone.trim()) &&
    hay.includes(input.email.trim())
  );
}
