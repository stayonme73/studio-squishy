/**
 * Shared fact-preservation rules for the live static-creative lane.
 *
 * The Maya class: intake/truth mapping overwrote `headline` with the CTA, so
 * "Grand Opening" never reached composition. Emphasis is a composition
 * instruction. It is not a licence to delete a supplied fact.
 */

export type SuppliedFactLine = {
  id: string;
  text: string;
};

export function normalizeFact(value: string): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * A required supplied line is lost when it appears in the intake and does not
 * appear in any truth field, and is not contained in a longer supplied line
 * that did survive.
 */
export function missingSuppliedFacts(input: {
  supplied: readonly SuppliedFactLine[];
  truthValues: readonly string[];
}): readonly string[] {
  const hay = input.truthValues.map(normalizeFact).filter(Boolean);
  return input.supplied
    .filter((line) => {
      const wanted = normalizeFact(line.text);
      if (wanted.length < 2) return false;
      return !hay.some((value) => value === wanted || value.includes(wanted));
    })
    .map((line) => line.id);
}

export function headlineWasReplacedByCta(input: {
  suppliedHeadline: string;
  mappedHeadline: string;
  mappedCta: string;
}): boolean {
  const supplied = normalizeFact(input.suppliedHeadline);
  const mapped = normalizeFact(input.mappedHeadline);
  const cta = normalizeFact(input.mappedCta);
  if (!supplied || !cta) return false;
  return mapped === cta && supplied !== cta;
}

export function assertLiveFactsPreserved(input: {
  supplied: readonly SuppliedFactLine[];
  truthValues: readonly string[];
  suppliedHeadline?: string;
  mappedHeadline?: string;
  mappedCta?: string;
}): { ok: true } | { ok: false; code: string; message: string } {
  if (
    input.suppliedHeadline &&
    input.mappedHeadline != null &&
    input.mappedCta != null &&
    headlineWasReplacedByCta({
      suppliedHeadline: input.suppliedHeadline,
      mappedHeadline: input.mappedHeadline,
      mappedCta: input.mappedCta,
    })
  ) {
    return {
      ok: false,
      code: "TRUTH_HEADLINE_REPLACED_BY_CTA",
      message:
        "Live truth mapping replaced the supplied headline with the CTA. Emphasis is composition-only; the headline fact must survive.",
    };
  }
  const missing = missingSuppliedFacts(input);
  if (missing.length > 0) {
    return {
      ok: false,
      code: "SUPPLIED_FACT_DROPPED",
      message: `Live truth mapping dropped supplied fact(s): ${missing.join(", ")}.`,
    };
  }
  return { ok: true };
}
