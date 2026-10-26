/**
 * Theme-led campaign truth for packages where the call to action, dates,
 * contact details, price, and logo are optional and may be blank.
 * Everything painted or captioned comes from the customer's theme, core
 * message, wordmark, and any optional facts they actually supplied.
 */

export type ThemeLedCampaignTruth = {
  theme: string;
  coreMessage: string;
};

export const THEME_LED_IMAGERY_THEME = "typography_only_brand_campaign" as const;

/** Three customer steps read straight from a comma-separated core message. */
export function themeLedBeats(coreMessage: string): readonly [string, string, string] | null {
  const parts = coreMessage
    .trim()
    .replace(/[.!]+$/, "")
    .split(/\s*,\s*/)
    .map((part) => part.replace(/^and\s+/i, "").trim())
    .filter(Boolean);
  if (parts.length !== 3) return null;
  const beats = parts.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}.`);
  return beats as unknown as readonly [string, string, string];
}

/**
 * A theme written as a brief ("Promote X as a …") reads as a statement on art
 * ("X is a …"). Any other theme is used exactly as the customer wrote it.
 */
export function themeLedStatement(theme: string): string {
  const trimmed = theme.trim();
  const directive = trimmed.match(
    /^(?:promote|present|position|introduce|show)\s+(.+?)\s+as\s+(an?\s+.+)$/i,
  );
  if (!directive) return trimmed;
  return `${directive[1]} is ${directive[2]}`;
}

/** The parts of a "X is a ROLE for AUDIENCE who need NEED without RELIEF" statement. */
export type ThemeLedFacets = {
  subject: string;
  role: string;
  audience: string;
  need: string;
  relief: string;
};

export function themeLedFacets(theme: string): ThemeLedFacets | null {
  const match = themeLedStatement(theme)
    .replace(/[.!]+$/, "")
    .match(/^(.+?)\s+is\s+(an?\s+.+?)\s+for\s+(.+?)\s+who\s+needs?\s+(.+?)\s+without\s+(.+)$/i);
  if (!match) return null;
  const [, subject, role, audience, need, relief] = match;
  return { subject: subject!, role: role!, audience: audience!, need: need!, relief: relief! };
}

function sentence(text: string): string {
  const trimmed = text.trim().replace(/[.!]+$/, "");
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}.`;
}

/** The audience's own wording turned to address the reader directly. */
function toReader(text: string): string {
  return text
    .replace(/\bthemselves\b/gi, "yourself")
    .replace(/\btheir\b/gi, "your")
    .replace(/\bthey\b/gi, "you");
}

/**
 * One distinct line per job in the set. Post 1 carries the whole idea; every
 * other piece gets its own supporting line drawn from a different part of the
 * customer's theme, so no sentence is recycled across the campaign. When the
 * theme cannot be split into those parts, supporting lines are left out
 * rather than filled with repeated or invented wording.
 */
export type ThemeLedCopyPlan = {
  core: string;
  statement: string;
  beats: readonly [string, string, string];
  stepSupport: readonly [string | null, string | null, string | null];
  portraitLead: string | null;
  captions: readonly [string, string, string, string];
};

export function themeLedCopyPlan(input: {
  theme: ThemeLedCampaignTruth;
  wordmark: string;
  cta: string;
}): ThemeLedCopyPlan {
  const beats = themeLedBeats(input.theme.coreMessage)!;
  const facets = themeLedFacets(input.theme.theme);
  const name = input.wordmark;
  const cta = input.cta.trim() ? ` ${input.cta.trim()}` : "";
  const role = facets?.role.replace(/^an?\s+/i, "") ?? null;
  return {
    core: input.theme.coreMessage.trim(),
    statement: themeLedStatement(input.theme.theme),
    beats,
    stepSupport: facets
      ? [
          sentence(`${facets.need} for ${facets.audience}`),
          sentence(`without ${toReader(facets.relief)}`),
          sentence(`your ${role}`),
        ]
      : [null, null, null],
    portraitLead: facets ? sentence(`three steps to ${facets.need}`) : null,
    captions: [
      `How does ${name} work? Three steps, one post at a time.`,
      `Start by picking the pieces your business needs from ${name}.`,
      `${beats[1]} Share the details, and ${name} takes it from there.`,
      `This is where ${name} takes over and handles the production for you.${cta}`,
    ],
  };
}

/** Repetition the set must not carry: one line reused across pieces, or a piece saying its message twice. */
export function themeLedRepetitionFinding(
  pieces: readonly { id: string; lines: readonly string[] }[],
  core: string,
  beats: readonly string[],
): string | null {
  const seen = new Map<string, string>();
  for (const piece of pieces) {
    const lines = piece.lines.map((line) => line.trim()).filter(Boolean);
    const joined = lines.join("\n");
    if (joined.includes(core) && beats.some((beat) => lines.includes(beat))) {
      return `${piece.id} states the core message and restates its steps on the same piece`;
    }
    for (const line of lines) {
      if (line.length < 40) continue;
      const owner = seen.get(line);
      if (owner && owner !== piece.id) return `"${line}" is repeated on ${owner} and ${piece.id}`;
      seen.set(line, piece.id);
    }
  }
  return null;
}

export function assertThemeLedCampaignTruth(
  theme: ThemeLedCampaignTruth | undefined,
): asserts theme is ThemeLedCampaignTruth {
  if (!theme?.theme.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: theme-led campaign requires the customer theme");
  }
  if (!theme.coreMessage.trim()) {
    throw new Error("MISSING_REQUIRED_TRUTH: theme-led campaign requires the customer core message");
  }
  if (!themeLedBeats(theme.coreMessage)) {
    throw new Error(
      "MISSING_REQUIRED_TRUTH: theme-led layouts need a core message with three comma-separated parts. Do not invent the missing steps.",
    );
  }
}

/** Number-like or contact-like text the customer did not supply must not appear. */
const PRICE_RE = /\$\s*\d/;
const PHONE_RE = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const URL_RE = /\b(?:https?:\/\/|www\.)|\b[a-z0-9-]+\.(?:com|net|org|io|co|us)\b/i;

/** Engagement prompts are calls to action; they only appear when the customer supplied one. */
const ENGAGEMENT_PROMPT_RE =
  /\b(?:follow (?:along|us)|link in (?:our )?bio|(?:dm|message|call|contact|email) us|visit (?:us|our)|book (?:now|today)|(?:click|tap) (?:here|the link)|subscribe|sign up|get started|like and (?:share|comment)|tag a friend|comment below)\b/i;

export function themeLedInventedCtaFinding(text: string, suppliedCta: string): string | null {
  if (suppliedCta.trim()) return null;
  const match = text.match(ENGAGEMENT_PROMPT_RE);
  return match ? match[0] : null;
}

export function themeLedUnsuppliedFactLeak(
  text: string,
  supplied: { phone: string; webDisplay: string; priceDisplay: string },
): string | null {
  if (!supplied.priceDisplay.trim() && PRICE_RE.test(text)) return "price";
  if (!supplied.phone.trim() && PHONE_RE.test(text)) return "phone";
  if (!supplied.webDisplay.trim() && URL_RE.test(text)) return "website";
  return null;
}
