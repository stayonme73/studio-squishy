/**
 * Light-edit path for landing-page body copy.
 * Catalog allows light editing of customer-supplied wording — not new marketing claims.
 */

export type LandingCopyLightEditResult = {
  text: string;
  changed: boolean;
  findings: readonly string[];
};

const AWKWARD_PATTERNS: readonly { id: string; re: RegExp; note: string }[] = [
  {
    id: "portrait_story_phrase",
    re: /portrait story/i,
    note: "Awkward generated-sounding phrase 'portrait story'",
  },
  {
    id: "handle_the_story",
    re: /we will handle the .{0,40}story/i,
    note: "Awkward 'we will handle the … story' construction",
  },
];

/**
 * Apply narrow light edits that preserve fixture facts and remove awkward phrasing.
 * Does not invent prices, deadlines, or new offer claims.
 */
export function lightEditLandingBodyCopy(raw: string): LandingCopyLightEditResult {
  const findings: string[] = [];
  let text = raw.trim();

  for (const p of AWKWARD_PATTERNS) {
    if (p.re.test(text)) findings.push(p.id);
  }

  if (findings.length === 0) {
    return { text, changed: false, findings };
  }

  // Replace the known awkward second clause with natural wording from the same facts.
  // Keeps: Cedar Lane Studio, Portrait Refresh, ninety-nine dollars, bring your best self, calm/clear portrait.
  const edited = text
    .replace(
      /\s*Bring your best self\s*[—\-]\s*we will handle the calm, clear portrait story\.?/i,
      " Bring your best self for a calm, clear portrait.",
    )
    .replace(/\s+/g, " ")
    .trim();

  if (edited === text) {
    findings.push("light_edit_unresolved");
    return { text, changed: false, findings };
  }

  return { text: edited, changed: true, findings };
}

export function landingBodyCopyNeedsLightEdit(raw: string): boolean {
  return AWKWARD_PATTERNS.some((p) => p.re.test(raw));
}
