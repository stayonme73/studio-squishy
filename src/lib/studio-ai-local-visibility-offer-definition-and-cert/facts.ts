import { studioAiLocalVisibilityOfferDefinitionAndCertV1 as pack } from "@/config/studio-ai-local-visibility-offer-definition-and-cert-v1";

export type LocalVisibilityIntake = {
  campaignId: string;
  businessName: string;
  city: string;
  services: readonly string[];
  address?: string;
  phone?: string;
  websiteUrl?: string;
  hours?: string;
  hoursNote?: string;
  requiredDisclosure?: string;
};

export type FactGateResult =
  | { ok: true; conflicts: readonly string[] }
  | {
      ok: false;
      code: "MISSING_FACT" | "CONFLICT" | "INVENTED_FACT" | "FORBIDDEN_CLAIM";
      message: string;
      conflicts: readonly string[];
    };

const STRUCTURAL_WORDS = new Set(
  [
    "a",
    "an",
    "the",
    "and",
    "or",
    "of",
    "in",
    "at",
    "to",
    "for",
    "we",
    "you",
    "our",
    "your",
    "is",
    "are",
    "on",
    "from",
    "with",
    "by",
    "call",
    "visit",
    "offer",
    "offers",
    "offering",
    "serving",
    "located",
    "hours",
    "phone",
    "website",
    "services",
    "service",
    "open",
    "now",
    "paste",
    "this",
    "into",
    "your",
    "own",
    "profile",
    "profiles",
    "description",
    "short",
    "business",
  ].map((word) => word.toLowerCase()),
);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9&\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

export function factLexicon(intake: LocalVisibilityIntake): Set<string> {
  const blob = [
    intake.businessName,
    intake.city,
    ...intake.services,
    intake.address ?? "",
    intake.phone ?? "",
    intake.websiteUrl ?? "",
    intake.hours ?? "",
    intake.hoursNote ?? "",
    intake.requiredDisclosure ?? "",
  ].join(" ");
  return new Set(tokens(blob));
}

export function findFactConflicts(intake: LocalVisibilityIntake): string[] {
  const conflicts: string[] = [];
  const hours = `${intake.hours ?? ""} ${intake.hoursNote ?? ""}`.toLowerCase();
  if (
    /sat/i.test(intake.hours ?? "") &&
    /closed saturday/i.test(intake.hoursNote ?? "")
  ) {
    conflicts.push(
      "Hours list Saturday as open and the note says closed Saturday. Ask the customer. Do not guess.",
    );
  }
  if (/sunday/i.test(hours) && /closed sunday/i.test(hours) && /open sunday/i.test(hours)) {
    conflicts.push("Sunday hours conflict. Ask the customer. Do not guess.");
  }
  return conflicts;
}

export function textStaysInsideFacts(
  text: string,
  intake: LocalVisibilityIntake,
): boolean {
  const allowed = factLexicon(intake);
  return tokens(text).every((word) => allowed.has(word) || STRUCTURAL_WORDS.has(word));
}

export function evaluateLocalVisibilityFacts(
  intake: LocalVisibilityIntake,
  studioTexts: readonly string[],
): FactGateResult {
  if (!intake.businessName.trim() || !intake.city.trim() || intake.services.length === 0) {
    return {
      ok: false,
      code: "MISSING_FACT",
      message:
        "Local Visibility needs a business name, a city or service area, and at least one real service.",
      conflicts: [],
    };
  }
  const conflicts = findFactConflicts(intake);
  if (conflicts.length > 0) {
    return {
      ok: false,
      code: "CONFLICT",
      message: conflicts[0]!,
      conflicts,
    };
  }
  const joined = studioTexts.join("\n");
  for (const pattern of pack.prohibitedPatterns) {
    if (pattern.test(joined)) {
      return {
        ok: false,
        code: "FORBIDDEN_CLAIM",
        message:
          "The Studio will not write ranking, lead, sales, award, or AI-recommendation claims.",
        conflicts: [],
      };
    }
  }
  if (studioTexts.some((text) => !textStaysInsideFacts(text, intake))) {
    return {
      ok: false,
      code: "INVENTED_FACT",
      message:
        "A deliverable added a service, place, hour, or claim that is not in the customer facts.",
      conflicts: [],
    };
  }
  return { ok: true, conflicts: [] };
}
