import { checkStudioVoiceReply, claimsForApprovedSentence } from "./check-reply";
import { requestStudioVoiceDraft, studioVoiceModel } from "./anthropic-reply";
import { escalateStudioVoiceRequest, type StudioVoiceEscalationProof } from "./escalate";
import {
  fallbackStudioVoiceSay,
  guidedAnswerInsteadOfRefusal,
  knownAnswerInsteadOfIgnorance,
  packageAsked,
  rememberedPackage,
} from "./fallback";
import { studioVoiceGuidesForQuestion, type StudioVoiceGuide } from "./customer-guidance";
import { buildStudioVoiceFactsCard, type StudioVoiceFactsCard } from "./facts-card";
import { sanitizeStudioVoiceTurns } from "./session";
import {
  STUDIO_VOICE_DISCLOSURE,
  STUDIO_VOICE_EXCHANGE_LIMIT,
  STUDIO_VOICE_QUESTION_LIMIT,
  type StudioVoiceIntent,
  type StudioVoiceSessionTurn,
} from "./types";
import type { CoordinatorExecutionState } from "@/studio-coordinator/types";

export type StudioVoiceTurnSource = "anthropic" | "fallback" | "coordinator";

export type StudioVoiceTurnResult = {
  say: string;
  turns: StudioVoiceSessionTurn[];
  source: StudioVoiceTurnSource;
  intent: StudioVoiceIntent;
  rejectedReasons: string[];
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
  model: string;
  escalation: StudioVoiceEscalationProof;
  guides: readonly StudioVoiceGuide[];
};

function blankUsage() {
  return { inputTokens: 0, outputTokens: 0, costUsd: 0 };
}

export function containsPersonalData(text: string): boolean {
  return (
    /@/.test(text) ||
    /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(text) ||
    /\b\d{13,19}\b/.test(text)
  );
}

export function studioVoiceHostMayUseProvider(host: string | null | undefined): boolean {
  const value = (host ?? "").trim().toLowerCase();
  return value.startsWith("localhost:") || value.startsWith("127.0.0.1:");
}

function spoken(body: string, first: boolean): string {
  const stripped = body
    .replace(/^I'm Studio Voice, The Studio's AI assistant\.?\s*/i, "")
    .trim();
  if (!first) return stripped;
  return `${STUDIO_VOICE_DISCLOSURE} ${stripped}`.replace(/\s+/g, " ").trim();
}

function remember(
  turns: StudioVoiceSessionTurn[],
  question: string,
  say: string,
): StudioVoiceSessionTurn[] {
  const next: StudioVoiceSessionTurn[] = [
    ...turns,
    { role: "customer", text: question },
    { role: "studio", text: say },
  ];
  return next.slice(-(STUDIO_VOICE_EXCHANGE_LIMIT * 2));
}

function approvedOrSafe(say: string, card: StudioVoiceFactsCard): { say: string; reasons: string[] } {
  const checked = checkStudioVoiceReply(
    { say, intent: "answer", claims: claimsForApprovedSentence(say, card) },
    card,
  );
  if (checked.ok) return { say: checked.draft.say, reasons: [] };
  const safe = fallbackStudioVoiceSay("What is the mayor's favorite color?", [], card);
  return { say: safe, reasons: checked.reasons };
}

/**
 * One checked conversation turn.
 * `escalationState` is only for an in-process synthetic project. The HTTP route does not pass it.
 */
export async function runStudioVoiceTurn(input: {
  question: string;
  turns?: unknown;
  inputMode?: "text" | "voice";
  escalationState?: CoordinatorExecutionState;
  allowProvider?: boolean;
  fetchImpl?: typeof fetch;
  now?: string;
}): Promise<StudioVoiceTurnResult> {
  const card = buildStudioVoiceFactsCard();
  const prior = sanitizeStudioVoiceTurns(input.turns);
  const first = prior.length === 0;
  const question = input.question.replace(/\s+/g, " ").trim().slice(0, STUDIO_VOICE_QUESTION_LIMIT);
  const inputMode = input.inputMode === "voice" ? "voice" : "text";
  const usage = blankUsage();

  if (!question) {
    const say = spoken("I did not catch that. Please tell me what you need.", first);
    return {
      say,
      turns: remember(prior, " ", say),
      source: "fallback",
      intent: "confusion",
      rejectedReasons: [],
      usage,
      model: studioVoiceModel(),
      escalation: {
        kind: "none",
        written: false,
        say: null,
        interaction: null,
        exception: null,
        determination: null,
        humanReviewRequired: null,
      },
      guides: [],
    };
  }

  const guides = studioVoiceGuidesForQuestion(question);
  const personal = containsPersonalData(question) || prior.some((turn) => containsPersonalData(turn.text));
  const safeQuestion = personal
    ? "The customer included a personal detail that was not kept."
    : question;
  const turnsForModel = personal ? [] : prior;

  if (personal) {
    const say = spoken(
      "Please don't put an email address, phone number, or card number in this chat. I can answer about Studio packages without that.",
      first,
    );
    return {
      say,
      turns: remember(prior, safeQuestion, say),
      source: "fallback",
      intent: "answer",
      rejectedReasons: ["Personal details are not sent."],
      usage,
      model: studioVoiceModel(),
      escalation: {
        kind: "none",
        written: false,
        say: null,
        interaction: null,
        exception: null,
        determination: null,
        humanReviewRequired: null,
      },
      guides,
    };
  }

  const escalation = escalateStudioVoiceRequest({
    question,
    inputMode,
    state: input.escalationState,
    now: input.now,
  });

  if (escalation.say) {
    const checked = approvedOrSafe(escalation.say, card);
    const say = spoken(checked.say, first);
    return {
      say,
      turns: remember(prior, question, say),
      source: "coordinator",
      intent: escalation.kind.startsWith("complaint") ? "complaint" : "refund",
      rejectedReasons: checked.reasons,
      usage,
      model: studioVoiceModel(),
      escalation,
      guides,
    };
  }

  const asked = packageAsked(question, card);
  const remembered = rememberedPackage(prior, card);
  const followUp = /thank|after that|and after|that one|the price|how much|frustrat|already said|i told you|explain|simpler|plain language|technical words|what does that mean|in other words/i.test(
    question,
  );
  const focusPackage = asked ?? (followUp ? remembered : null);
  const keyReady = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const allowProvider = input.allowProvider !== false && keyReady;
  const rejectedReasons: string[] = [];
  let say = "";
  let intent: StudioVoiceIntent = "answer";
  let source: StudioVoiceTurnSource = "fallback";

  if (allowProvider) {
    const firstCall = await requestStudioVoiceDraft({
      facts: card,
      turns: turnsForModel,
      question,
      focusPackage,
      fetchImpl: input.fetchImpl,
    });
    if (firstCall.call) {
      usage.inputTokens += firstCall.call.usage.textInputTokens;
      usage.outputTokens += firstCall.call.usage.textOutputTokens;
      usage.costUsd += firstCall.call.costUsd;
    }
    const checked = firstCall.draft ? checkStudioVoiceReply(firstCall.draft, card) : null;
    if (checked?.ok) {
      say = checked.draft.say;
      intent = checked.draft.intent;
      source = "anthropic";
    } else if (checked && !checked.ok) {
      rejectedReasons.push(...checked.reasons);
      const rejectedText = typeof firstCall.draft?.say === "string" ? firstCall.draft.say.slice(0, 280) : "";
      if (rejectedText) rejectedReasons.push(`Rejected text: ${rejectedText}`);
      const repair = await requestStudioVoiceDraft({
        facts: card,
        turns: turnsForModel,
        question,
        focusPackage,
        repairReasons: rejectedReasons,
        fetchImpl: input.fetchImpl,
      });
      if (repair.call) {
        usage.inputTokens += repair.call.usage.textInputTokens;
        usage.outputTokens += repair.call.usage.textOutputTokens;
        usage.costUsd += repair.call.costUsd;
      }
      const repaired = repair.draft ? checkStudioVoiceReply(repair.draft, card) : null;
      if (repaired?.ok) {
        say = repaired.draft.say;
        intent = repaired.draft.intent;
        source = "anthropic";
        rejectedReasons.length = 0;
      } else if (repaired && !repaired.ok) {
        rejectedReasons.push(...repaired.reasons);
      }
    } else if (firstCall.httpStatus === 0) {
      rejectedReasons.push("The conversation service did not respond.");
    } else {
      rejectedReasons.push("The conversation service returned an unusable reply.");
    }
  } else {
    rejectedReasons.push("The conversation service was not used.");
  }

  const known = say ? knownAnswerInsteadOfIgnorance(question, say, card) : null;
  if (known) {
    say = known;
    source = "fallback";
    intent = "answer";
    rejectedReasons.push("The reply claimed not to know a published Studio boundary.");
  }

  const guided = say ? guidedAnswerInsteadOfRefusal(question, say, card) : null;
  if (guided) {
    say = guided;
    source = "fallback";
    intent = "answer";
    rejectedReasons.push("The reply refused a Studio question the desk can answer.");
  }

  if (!say) {
    say = fallbackStudioVoiceSay(question, prior, card);
    source = "fallback";
    intent = "answer";
  }

  if (/\bi have recorded\b/i.test(say) && !escalation.written) {
    say = fallbackStudioVoiceSay("What is the mayor's favorite color?", [], card);
    source = "fallback";
    rejectedReasons.push("The reply claimed a record that was not written.");
  }

  const spokenSay = spoken(say, first);
  return {
    say: spokenSay,
    turns: remember(prior, question, spokenSay),
    source,
    intent,
    rejectedReasons,
    usage,
    model: studioVoiceModel(),
    escalation,
    guides,
  };
}
