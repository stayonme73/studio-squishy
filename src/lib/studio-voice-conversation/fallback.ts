import { studioVoiceLaunchBlockerHardeningV1 } from "@/config/studio-voice-launch-blocker-hardening-v1";
import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";
import { answerCustomerLifeQuestion } from "@/lib/studio-customer-life/answer-question";

import { checkStudioVoiceReply, claimsForApprovedSentence } from "./check-reply";
import {
  STUDIO_VOICE_UNATTACHED_COMPLAINT,
  STUDIO_VOICE_UNATTACHED_REFUND,
  studioVoiceCustomerGuidance,
} from "./customer-guidance";
import type { StudioVoiceFactsCard, StudioVoicePackageFact } from "./facts-card";
import type { StudioVoiceSessionTurn } from "./types";

const harden = studioVoiceLaunchBlockerHardeningV1;
const NO_PROJECT = studioCustomerLifeV1.customerCopy.noProjectYet;

const OUTSIDE =
  "That is outside what I can answer from The Studio. I do not know that, and I will not guess.";

const SAFE =
  "I can help with the four Studio packages. I will not guess a price, a date, or a refund decision.";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function named(text: string, row: StudioVoicePackageFact): boolean {
  return normalize(text).includes(normalize(row.name));
}

export function officialPackageSentence(row: StudioVoicePackageFact): string {
  return `${row.name} is ${row.listDisplay}. With the 20% Studio Thank-You, you pay ${row.dueDisplay}.`;
}

export function packageAsked(
  question: string,
  card: StudioVoiceFactsCard,
): StudioVoicePackageFact | undefined {
  const text = normalize(question);
  if (/short form|short video/.test(text)) {
    return card.packages.find((row) => row.packageId === "short_form_video_editing");
  }
  if (/clip repurpos|long recording/.test(text)) {
    return card.packages.find((row) => row.packageId === "clip_repurposing");
  }
  if (/campaign launch|launch kit/.test(text)) {
    return card.packages.find((row) => row.packageId === "campaign_launch_kit");
  }
  if (/graphic|promotion/.test(text)) {
    return card.packages.find((row) => row.packageId === "social_and_promo_graphics");
  }
  return undefined;
}

export function rememberedPackage(
  turns: readonly StudioVoiceSessionTurn[],
  card: StudioVoiceFactsCard,
): StudioVoicePackageFact | null {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn.role !== "studio") continue;
    const matches = card.packages.filter(
      (row) => turn.text.includes(row.listDisplay) && turn.text.includes(row.dueDisplay),
    );
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      return [...matches].sort(
        (left, right) => turn.text.lastIndexOf(left.name) - turn.text.lastIndexOf(right.name),
      )[matches.length - 1];
    }
  }
  return null;
}

function accept(say: string, card: StudioVoiceFactsCard): string | null {
  const checked = checkStudioVoiceReply(
    { say, intent: "answer", claims: claimsForApprovedSentence(say, card) },
    card,
  );
  return checked.ok ? checked.draft.say : null;
}

/**
 * Truthful reply when the model is down or its reply was rejected.
 * Prices come from the facts card or from an already checked earlier reply.
 */
export function fallbackStudioVoiceSay(
  question: string,
  turns: readonly StudioVoiceSessionTurn[],
  card: StudioVoiceFactsCard,
): string {
  const guided = studioVoiceCustomerGuidance(question, "public");
  if (guided) {
    const sentence = accept(guided.say, card);
    if (sentence) return sentence;
  }

  const asked = packageAsked(question, card);
  const script = answerCustomerLifeQuestion(question, {
    campaign: null,
    account: { signedIn: false },
  });
  const scripted =
    script.known && script.text && !script.text.includes(NO_PROJECT) && !script.text.toLowerCase().includes("saved studio project")
      ? accept(script.text, card)
      : null;
  if (scripted && (!asked || named(scripted, asked))) return scripted;

  if (asked) {
    const sentence = accept(officialPackageSentence(asked), card);
    if (sentence) return sentence;
  }

  const remembered = rememberedPackage(turns, card);
  const followUp = /thank|after that|and after|that one|the price|how much|explain|simpler|plain language|technical words|what does that mean|in other words/.test(
    question.toLowerCase(),
  );
  const frustrated = /frustrat|already said|i told you/.test(question.toLowerCase());
  if (remembered && (followUp || frustrated)) {
    const lead = frustrated
      ? `I hear that this is frustrating. We can stay with what you already asked about. ${officialPackageSentence(remembered)}`
      : `Yes. ${officialPackageSentence(remembered)}`;
    const sentence = accept(lead, card);
    if (sentence) return sentence;
  }

  if (/confus|what do i do|what next|next step|what happens next/.test(question.toLowerCase())) {
    const sentence = accept(card.nextStep, card);
    if (sentence) return sentence;
  }

  return accept(OUTSIDE, card) ?? SAFE;
}

/** A known Studio answer replaces "I don't know" when the question is already answered. */
export function knownAnswerInsteadOfIgnorance(
  question: string,
  say: string,
  card: StudioVoiceFactsCard,
): string | null {
  if (!/\b(i don't know|i do not know|i dont know)\b/i.test(say)) return null;
  const script = answerCustomerLifeQuestion(question, {
    campaign: null,
    account: { signedIn: false },
  });
  if (!script.known || !script.text || script.text.includes(NO_PROJECT)) return null;
  return accept(script.text, card);
}

/** A trained Studio answer replaces an "outside my scope" refusal. */
export function guidedAnswerInsteadOfRefusal(
  question: string,
  say: string,
  card: StudioVoiceFactsCard,
): string | null {
  if (!/\b(outside what i can|i do not know|i don't know|i dont know)\b/i.test(say)) return null;
  const guided = studioVoiceCustomerGuidance(question, "public");
  if (!guided) return null;
  return accept(guided.say, card);
}

export function approvedRefundSay(): string {
  return harden.refundAck;
}

export function approvedComplaintSay(): string {
  return harden.complaintAck;
}

export function unattachedOwnerSay(): string {
  return STUDIO_VOICE_UNATTACHED_REFUND;
}

export function unattachedComplaintSay(): string {
  return STUDIO_VOICE_UNATTACHED_COMPLAINT;
}
