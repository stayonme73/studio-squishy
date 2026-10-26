/**
 * Brief compliance — did the sheet print what the customer asked for, and only that?
 *
 * The validator in `validate-document.ts` asks whether the composition kept its
 * promises to the *truth contract*. This asks a narrower and more literal
 * question, against the customer's supplied wording:
 *
 *   - every supplied line reached the artifact, verbatim
 *   - no supplied line was printed twice
 *   - nothing appears on the sheet that the customer did not supply
 *
 * The third rule is the one that matters most and the one a passing render cannot
 * demonstrate on its own. A composition can carry every required fact and still
 * invent a slogan, a badge, or a second offer. So this reconciles in both
 * directions: supplied lines to rendered lines, and rendered lines back to
 * supplied lines, with nothing left over on either side.
 *
 * Case is treated as presentation, not wording. A line set in small caps is still
 * the customer's line; a line whose words changed is not.
 */

import type { RenderedFactCheck } from "./types";

export type SuppliedCustomerLine = {
  /** Brief field this line came from. */
  id: string;
  label: string;
  /** Exactly as the customer supplied it. */
  text: string;
};

export type BriefComplianceLine = {
  id: string;
  label: string;
  supplied: string;
  rendered: string | null;
  elementId: string | null;
  present: boolean;
  /** Same words, whatever the case. */
  verbatim: boolean;
  /** Rendered differs from supplied by case only. */
  caseTransformedOnly: boolean;
  occurrences: number;
};

export type BriefComplianceReport = {
  ok: boolean;
  lines: readonly BriefComplianceLine[];
  missing: readonly string[];
  duplicated: readonly string[];
  /** Text on the sheet that no supplied line accounts for — invented content. */
  unaccounted: readonly { elementId: string; text: string }[];
  /** Rendered lines that carry the customer's words in a different case. */
  caseTransformed: readonly string[];
};

function collapse(value: string): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function comparable(value: string): string {
  return collapse(value).toLowerCase();
}

/**
 * Reconcile a rendered artifact against the supplied brief.
 *
 * `rendered` is the per-element evidence measured in the page, so this grades what
 * reached the pixels rather than what the composer intended.
 */
export function checkBriefCompliance(input: {
  supplied: readonly SuppliedCustomerLine[];
  rendered: readonly RenderedFactCheck[];
}): BriefComplianceReport {
  const visible = input.rendered.filter(
    (fact) => collapse(fact.renderedText).length > 0,
  );
  const accountedElementIds = new Set<string>();
  const lines: BriefComplianceLine[] = [];

  for (const supplied of input.supplied) {
    const wanted = comparable(supplied.text);
    const matches = visible.filter((fact) => comparable(fact.renderedText) === wanted);
    for (const match of matches) accountedElementIds.add(match.elementId);
    const first = matches[0] ?? null;
    const renderedText = first ? collapse(first.renderedText) : null;
    lines.push({
      id: supplied.id,
      label: supplied.label,
      supplied: collapse(supplied.text),
      rendered: renderedText,
      elementId: first?.elementId ?? null,
      present: matches.length > 0,
      verbatim: matches.length > 0,
      caseTransformedOnly:
        renderedText != null && renderedText !== collapse(supplied.text),
      occurrences: matches.length,
    });
  }


  return {
    ok:
      lines.every((line) => line.present && line.occurrences === 1) &&
      visible.every((fact) => accountedElementIds.has(fact.elementId)),
    lines,
    missing: lines.filter((line) => !line.present).map((line) => line.id),
    duplicated: lines.filter((line) => line.occurrences > 1).map((line) => line.id),
    unaccounted: visible
      .filter((fact) => !accountedElementIds.has(fact.elementId))
      .map((fact) => ({ elementId: fact.elementId, text: collapse(fact.renderedText) })),
    caseTransformed: lines
      .filter((line) => line.caseTransformedOnly)
      .map((line) => line.id),
  };
}
