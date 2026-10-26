import type { StudioVoiceFactsCard, StudioVoicePackageFact } from "./facts-card";
import type { StudioVoiceClaim, StudioVoiceDraft, StudioVoiceIntent } from "./types";

const INTENTS = new Set<StudioVoiceIntent>([
  "answer",
  "follow_up",
  "confusion",
  "frustration",
  "topic_change",
  "off_topic",
  "complaint",
  "refund",
]);

const SAVED_PROJECT_DEFECT = "saved Studio project";

export type StudioVoiceCheck =
  | { ok: true; draft: StudioVoiceDraft }
  | { ok: false; reasons: string[] };

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9$% ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function packageNamed(text: string, row: StudioVoicePackageFact): boolean {
  return normalize(text).includes(normalize(row.name));
}

function dollarCents(text: string): number[] {
  const found: number[] = [];
  const pattern = /\$(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?/g;
  for (const match of text.matchAll(pattern)) {
    const whole = Number(match[1].replace(/,/g, ""));
    const fraction = match[2] ? match[2].padEnd(2, "0") : "00";
    if (!Number.isFinite(whole)) continue;
    found.push(whole * 100 + Number(fraction));
  }
  return found;
}

function sentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+/).map((part) => part.trim());
  return parts.length > 0 ? parts : [text];
}

function negated(sentence: string): boolean {
  return /\b(not|no|never|won't|cannot|can't)\b/i.test(sentence);
}

function asIntent(value: unknown): StudioVoiceIntent {
  return typeof value === "string" && INTENTS.has(value as StudioVoiceIntent)
    ? (value as StudioVoiceIntent)
    : "answer";
}

function asClaim(value: unknown, card: StudioVoiceFactsCard): StudioVoiceClaim | string {
  if (!value || typeof value !== "object") return "A claim was not a structured fact.";
  const row = value as { type?: unknown; packageId?: unknown; listCents?: unknown; dueCents?: unknown; rounds?: unknown };
  switch (row.type) {
    case "package_price": {
      const packageId = typeof row.packageId === "string" ? row.packageId : "";
      const known = card.packages.find((item) => item.packageId === packageId);
      const listCents = Number(row.listCents);
      const dueCents = Number(row.dueCents);
      if (!known || listCents !== known.listCents || dueCents !== known.dueCents) {
        return "A package price does not match the approved menu.";
      }
      return { type: "package_price", packageId, listCents, dueCents };
    }
    case "revision_rounds": {
      const rounds = Number(row.rounds);
      if (rounds !== card.revisionRounds) return "Revision rounds do not match the approved menu.";
      return { type: "revision_rounds", rounds };
    }
    case "no_delivery_promise":
      return card.noDeliveryDate ? { type: "no_delivery_promise" } : "A delivery promise is not allowed.";
    case "files_after_checkout":
      return card.filesAfterCheckout
        ? { type: "files_after_checkout" }
        : "A file instruction is not on the facts card.";
    case "production_requires_acceptance":
      return card.productionRequiresAcceptance
        ? { type: "production_requires_acceptance" }
        : "A production rule is not on the facts card.";
    case "extras_included":
      return card.extrasIncludedAtNoExtraCharge
        ? { type: "extras_included" }
        : "An extras promise is not on the facts card.";
    case "no_performance_guarantee":
      return card.noPerformanceGuarantee
        ? { type: "no_performance_guarantee" }
        : "A guarantee is not allowed.";
    case "refund_not_decided":
      return card.refundDecision === "owner_only"
        ? { type: "refund_not_decided" }
        : "A refund decision is not allowed.";
    case "outside_studio_knowledge":
      return { type: "outside_studio_knowledge" };
    default:
      return "An unsupported claim was included.";
  }
}

/**
 * Accept a reply only when every price, package, and promise matches the facts card.
 * Searching the words for a suspicious price is not enough.
 */
export function checkStudioVoiceReply(
  draft: { say?: unknown; intent?: unknown; claims?: unknown },
  card: StudioVoiceFactsCard,
): StudioVoiceCheck {
  const reasons: string[] = [];
  const say = typeof draft.say === "string" ? draft.say.replace(/\s+/g, " ").trim() : "";
  if (!say) reasons.push("The reply was empty.");
  if (say.toLowerCase().includes(SAVED_PROJECT_DEFECT)) {
    reasons.push("The reply used the missing-project sentence.");
  }

  const claims: StudioVoiceClaim[] = [];
  const claimInput = Array.isArray(draft.claims) ? draft.claims : [];
  for (const entry of claimInput) {
    const claim = asClaim(entry, card);
    if (typeof claim === "string") reasons.push(claim);
    else claims.push(claim);
  }

  const priced = claims.filter(
    (claim): claim is Extract<StudioVoiceClaim, { type: "package_price" }> =>
      claim.type === "package_price",
  );
  const allowedCents = new Set(priced.flatMap((claim) => [claim.listCents, claim.dueCents]));

  for (const cents of dollarCents(say)) {
    if (!allowedCents.has(cents)) reasons.push("The reply states a price that was not approved.");
  }

  for (const row of card.packages) {
    const named = packageNamed(say, row);
    const pricedHere = dollarCents(say).some(
      (cents) => cents === row.listCents || cents === row.dueCents,
    );
    if (!named && !pricedHere) continue;
    const claim = priced.find((item) => item.packageId === row.packageId);
    if (!claim) reasons.push(`The reply mentions ${row.name} without an approved price claim.`);
    if (!named) reasons.push(`A ${row.name} price was stated without the package name.`);
    if (!say.includes(row.listDisplay) || !say.includes(row.dueDisplay)) {
      reasons.push(`${row.name} must include the approved list price and Thank-You price.`);
    }
    if (say.includes(row.dueDisplay) && !/thank-you/i.test(say)) {
      reasons.push("The Thank-You price must be named as the Studio Thank-You.");
    }
  }

  if (
    /\b(launch discount|launch promotion|during our launch|promotion ends|regular price|limited[- ]time)\b/i.test(say) ||
    /\bwill return\b/i.test(say) ||
    /\bnow\s+\$/i.test(say)
  ) {
    reasons.push("The reply describes the Studio Thank-You as a sale that ends.");
  }
  if (/\bexactly (what you need|right)\b/i.test(say)) {
    reasons.push("The reply promises a result The Studio does not promise.");
  }
  if (/\bproduction\b/i.test(say) && /\b(start|begin)/i.test(say)) {
    const hasGates =
      /payment/i.test(say) &&
      /intake/i.test(say) &&
      /material/i.test(say) &&
      /service/i.test(say) &&
      /moved into production/i.test(say);
    if (!hasGates || /materials are accepted and moved/i.test(say)) {
      reasons.push("The production rule does not match the approved start conditions.");
    }
  }

  for (const match of say.matchAll(/\b(\d+(?:\.\d+)?)\s*%/g)) {
    if (Number(match[1]) !== card.thankYouPercent) {
      reasons.push("The reply states a discount that was not approved.");
    }
  }

  if (/\brevision\b/i.test(say) && !claims.some((claim) => claim.type === "revision_rounds")) {
    reasons.push("The reply mentions revisions without the approved revision fact.");
  }
  if (/\bmy studio\b/i.test(say) && !claims.some((claim) => claim.type === "files_after_checkout")) {
    reasons.push("The reply mentions My Studio without the approved file fact.");
  }
  if (
    /\bno additional charge\b/i.test(say) &&
    !claims.some((claim) => claim.type === "extras_included")
  ) {
    reasons.push("The reply mentions extras pricing without the approved extras fact.");
  }
  if (/\bguarant/i.test(say) && !claims.some((claim) => claim.type === "no_performance_guarantee")) {
    reasons.push("The reply mentions a guarantee without the approved guarantee fact.");
  }
  if (/\brefund\b/i.test(say) && !claims.some((claim) => claim.type === "refund_not_decided")) {
    reasons.push("The reply mentions a refund without leaving the decision to the Owner.");
  }

  for (const sentence of sentences(say)) {
    if (
      /\b(?:in|within|after|ready in)\s+\d+\s*(?:business\s+)?(?:day|hour|week|month)s?\b/i.test(sentence) ||
      /\b\d+\s*-?\s*business\s+days?\b/i.test(sentence) ||
      /\b(?:tomorrow|next week|by (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i.test(sentence) ||
      /\bdelivery date is\b/i.test(sentence) ||
      /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/.test(sentence)
    ) {
      reasons.push("The reply promises a time the Studio does not promise.");
    }
    if (/\bguarant/i.test(sentence) && !negated(sentence)) {
      reasons.push("The reply makes a guarantee.");
    }
    if (
      /\b(visa|mastercard|master card|american express|amex|discover|paypal|apple pay|google pay|venmo|zelle)\b/i.test(
        sentence,
      ) &&
      !negated(sentence)
    ) {
      reasons.push("The reply names a payment method that is not verified.");
    }
    if (/\btax\b/i.test(sentence) && /\$\d/.test(sentence)) {
      reasons.push("The reply states a tax amount.");
    }
    if (
      /\b(payment succeeded|payment went through|payment is complete|payment was successful|you are paid|i have confirmed your payment)\b/i.test(
        sentence,
      ) &&
      !negated(sentence)
    ) {
      reasons.push("The reply claims a payment succeeded without a confirmation.");
    }
    if (/\brefund\b/i.test(sentence)) {
      const decides =
        /\b(approved|denied|granted|approve|deny|grant)\b/i.test(sentence) ||
        /\byou will receive a refund\b/i.test(sentence);
      if (decides && !negated(sentence)) reasons.push("The reply decides a refund.");
    }
    if (
      /\b(i|we|the studio)\s+(?:will\s+|can\s+)?(?:post|send|run)\b/i.test(sentence) &&
      !negated(sentence)
    ) {
      reasons.push("The reply promises work The Studio does not do.");
    }
  }

  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(say) || /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(say)) {
    reasons.push("The reply includes a personal contact detail.");
  }
  if (/\byour name is\b/i.test(say)) reasons.push("The reply invents a customer name.");
  if (/\bcreative qa\b/i.test(say) || /\$129\b/.test(say)) {
    reasons.push("The reply mentions a package that is not on the public menu.");
  }

  const intent = asIntent(draft.intent);
  if (intent === "off_topic" || claims.some((claim) => claim.type === "outside_studio_knowledge")) {
    if (!/\b(outside|do not know|don't know|cannot answer|can't answer)\b/i.test(say)) {
      reasons.push("An outside question needs a direct refusal to guess.");
    }
    if (/\b(?:favorite color|the answer)\s+is\s+(?!outside\b|not\b)/i.test(say)) {
      reasons.push("The reply invents an answer outside The Studio.");
    }
  }

  if (reasons.length > 0) return { ok: false, reasons: [...new Set(reasons)] };
  return { ok: true, draft: { say, intent, claims } };
}

/** Claims that make an already-approved sentence match the facts card. */
export function claimsForApprovedSentence(
  say: string,
  card: StudioVoiceFactsCard,
): StudioVoiceClaim[] {
  const claims: StudioVoiceClaim[] = [];
  for (const row of card.packages) {
    if (!packageNamed(say, row) && !dollarCents(say).some((cents) => cents === row.listCents || cents === row.dueCents)) {
      continue;
    }
    claims.push({
      type: "package_price",
      packageId: row.packageId,
      listCents: row.listCents,
      dueCents: row.dueCents,
    });
  }
  if (/\brevision\b/i.test(say)) claims.push({ type: "revision_rounds", rounds: card.revisionRounds });
  if (/\bmy studio\b/i.test(say)) claims.push({ type: "files_after_checkout" });
  if (/\bno additional charge\b/i.test(say)) claims.push({ type: "extras_included" });
  if (/\bguarant/i.test(say)) claims.push({ type: "no_performance_guarantee" });
  if (/\brefund\b/i.test(say)) claims.push({ type: "refund_not_decided" });
  if (/\b(outside|do not know|don't know)\b/i.test(say)) claims.push({ type: "outside_studio_knowledge" });
  if (/\bdelivery date\b/i.test(say)) claims.push({ type: "no_delivery_promise" });
  if (/\bproduction begins\b/i.test(say)) claims.push({ type: "production_requires_acceptance" });
  return claims;
}
