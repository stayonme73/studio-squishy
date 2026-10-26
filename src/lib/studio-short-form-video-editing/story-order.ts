import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import type { TranscriptSentence } from "./sentences";

const OFFER = studioShortFormVideoEditingBuildV1.offer;

export const EDITORIAL_ROLES = [
  "hook",
  "context",
  "body",
  "proof",
  "transition",
  "close",
  "cta_signoff",
  "exclude",
] as const;

export type EditorialRole = (typeof EDITORIAL_ROLES)[number];

export type StoryBeat = {
  index: number;
  text: string;
  role: EditorialRole;
  start: number;
  end: number;
};

export type StoryPlan =
  | {
      ok: true;
      beats: StoryBeat[];
      roles: EditorialRole[];
      reason: string;
      humanEditorWouldChooseThisOrder: true;
    }
  | {
      ok: false;
      findings: string[];
      beats: StoryBeat[];
      humanEditorWouldChooseThisOrder: false;
    };

const FILLER_ONLY = /^(um+|uh+|erm+|huh|yeah|okay|ok|so|like|you know)[.!?,]*$/i;

export function isFillerSentence(sentence: TranscriptSentence): boolean {
  const duration = sentence.end - sentence.start;
  if (duration < 0.7) return true;
  if (sentence.words.length <= 3 && FILLER_ONLY.test(sentence.text.trim())) {
    return true;
  }
  return false;
}

const CLOSE_RE =
  /\b(thank you|thanks for|hope you (enjoyed|liked)|that'?s (all|it)|goodbye|see you|come see us|tell them you heard)\b/i;
const CTA_RE = /\b(book|subscribe|follow us|visit|shop now|sign up|click)\b/i;
const HOOK_RE =
  /\b(favorite|here'?s|here is|i want to (tell|talk)|saturday|today we|my name is|the best)\b/i;
const CONTEXT_RE =
  /\b(i learned|when i|from my (parents|family)|growing up|at school|because i)\b/i;
const PROOF_RE = /\b(for example|like when|such as|which means)\b/i;
const SETUP_RE = /\b(i will teach|let me (tell|show|teach)|today i('m| am) going)\b/i;
const GREETING_RE =
  /^(hi|hello|hey|good (morning|afternoon|evening)|happy birthday|how are you)\b/i;
const WEAK_OPEN = /^(and|so|but|um|uh|like|you know)\b/i;

export function classifySentenceRole(sentence: TranscriptSentence): EditorialRole {
  if (isFillerSentence(sentence)) return "exclude";
  const text = sentence.text.trim();
  if (GREETING_RE.test(text) && text.split(/\s+/).length <= 4) return "exclude";
  if (CLOSE_RE.test(text)) return "close";
  if (CTA_RE.test(text) && !HOOK_RE.test(text)) return "cta_signoff";
  if (HOOK_RE.test(text) && !WEAK_OPEN.test(text)) return "hook";
  if (SETUP_RE.test(text)) return "context";
  if (CONTEXT_RE.test(text)) return "context";
  if (PROOF_RE.test(text)) return "proof";
  return "body";
}

export function beatFromSentence(
  sentence: TranscriptSentence,
  role = classifySentenceRole(sentence),
): StoryBeat {
  return {
    index: sentence.index,
    text: sentence.text,
    role,
    start: sentence.start,
    end: sentence.end,
  };
}

function spokenSeconds(beats: readonly StoryBeat[]): number {
  return beats.reduce((sum, beat) => sum + (beat.end - beat.start), 0);
}

const ALLOWED_ROLE_SEQUENCE =
  /^hook(?:-context)?(?:-body|-proof)*(?:-context)?(?:-transition)?(?:-close|-cta_signoff)?$/;

function hookCarriesValue(text: string): boolean {
  return /\bwhich means\b|\bfavorite\b.+\bis\b/i.test(text);
}

export function evaluateStorySequence(
  beats: readonly StoryBeat[],
): StoryPlan {
  const findings: string[] = [];
  const usable = beats.filter((beat) => beat.role !== "exclude");
  const roles = usable.map((beat) => beat.role);

  if (usable.length < 2) findings.push("not_enough_beats");
  if (usable[0] && usable[0].role !== "hook") findings.push("does_not_open_with_hook");
  const hasValue = usable.some((beat) => beat.role === "body" || beat.role === "proof");
  if (!hasValue && !(usable[0] && hookCarriesValue(usable[0].text))) {
    findings.push("missing_body_or_value");
  }
  if (
    usable[0] &&
    usable.slice(1).some((beat) => SETUP_RE.test(beat.text) && beat.start < usable[0]!.start)
  ) {
    findings.push("setup_after_payload");
  }
  const reversed = usable.some((beat, index) => {
    const prev = usable[index - 1];
    return Boolean(prev && beat.start + 0.25 < prev.start);
  });
  if (reversed) findings.push("chronology_breaking_reverse_cut");
  const last = usable[usable.length - 1];
  if (
    last &&
    last.role === "body" &&
    last.text.trim().split(/\s+/).length <= 3
  ) {
    findings.push("weak_ending");
  }

  const closeAt = usable.findIndex(
    (beat) => beat.role === "close" || beat.role === "cta_signoff",
  );
  if (closeAt >= 0 && closeAt < usable.length - 1) {
    findings.push("sign_off_before_remaining_explanation");
  }

  const sequence = roles.join("-");
  if (usable.length >= 2 && !ALLOWED_ROLE_SEQUENCE.test(sequence)) {
    findings.push(`role_sequence_not_a_short:${sequence}`);
  }

  const duration = spokenSeconds(usable);
  if (duration < OFFER.outputMinSeconds || duration > OFFER.outputMaxSeconds + 0.25) {
    findings.push("duration_out_of_band");
  }

  const humanEditorWouldChooseThisOrder = findings.length === 0;
  if (!humanEditorWouldChooseThisOrder) {
    return {
      ok: false,
      findings,
      beats: [...usable],
      humanEditorWouldChooseThisOrder: false,
    };
  }

  const hasContext = roles.includes("context");
  const reason = hasContext
    ? "hook → context → body → close: one idea, spoken in an order a human editor would keep."
    : "hook → body/value → close: one idea, spoken in an order a human editor would keep.";

  return {
    ok: true,
    beats: [...usable],
    roles,
    reason,
    humanEditorWouldChooseThisOrder: true,
  };
}

export function pickStoryOrderedSentences(
  sentences: readonly TranscriptSentence[],
  minSeconds = OFFER.outputMinSeconds,
  maxSeconds = OFFER.outputMaxSeconds,
): StoryPlan {
  const classified = sentences
    .map((sentence) => beatFromSentence(sentence))
    .filter((beat) => beat.role !== "exclude");
  if (!classified.length) {
    return {
      ok: false,
      findings: ["no_usable_beats"],
      beats: [],
      humanEditorWouldChooseThisOrder: false,
    };
  }

  const hooks = classified.filter((beat) => beat.role === "hook");
  const hook =
    hooks[0] ??
    classified.find((beat) => !WEAK_OPEN.test(beat.text)) ??
    classified[0]!;
  const hookBeat = { ...hook, role: "hook" as const };

  const later = classified
    .filter(
      (beat) => beat.index !== hookBeat.index && beat.start + 0.05 >= hookBeat.start,
    )
    .sort((left, right) => left.start - right.start);
  const close =
    [...later]
      .reverse()
      .find((beat) => beat.role === "close" || beat.role === "cta_signoff") ??
    null;
  const middle = later.filter((beat) => beat.index !== close?.index);

  const picked: StoryBeat[] = [hookBeat];
  let spoken = hookBeat.end - hookBeat.start;

  const tryAdd = (beat: StoryBeat | undefined) => {
    if (!beat) return;
    if (picked.some((kept) => kept.index === beat.index)) return;
    const last = picked[picked.length - 1]!;
    if (beat.start + 0.25 < last.start) return;
    const duration = beat.end - beat.start;
    if (spoken + duration > maxSeconds + 0.05) return;
    picked.push(beat);
    spoken += duration;
  };

  for (const beat of middle) {
    if (spoken >= minSeconds && picked.length >= 3) break;
    if (beat.role === "transition") continue;
    tryAdd(beat);
  }

  if (close) {
    const last = picked[picked.length - 1]!;
    if (close.start - last.end <= 30) {
      tryAdd({
        ...close,
        role: close.role === "cta_signoff" ? "cta_signoff" : "close",
      });
    }
  }

  return evaluateStorySequence(picked);
}

export function storyPlanFromIndexes(
  sentences: readonly TranscriptSentence[],
  indexes: readonly number[],
  roles?: readonly EditorialRole[],
): StoryPlan {
  const beats: StoryBeat[] = [];
  for (let offset = 0; offset < indexes.length; offset += 1) {
    const index = indexes[offset]!;
    const sentence = sentences[index];
    if (!sentence) {
      return {
        ok: false,
        findings: [`missing_sentence_${index}`],
        beats,
        humanEditorWouldChooseThisOrder: false,
      };
    }
    const role = roles?.[offset];
    beats.push(
      beatFromSentence(
        sentence,
        role && EDITORIAL_ROLES.includes(role) ? role : classifySentenceRole(sentence),
      ),
    );
  }
  return evaluateStorySequence(beats);
}
