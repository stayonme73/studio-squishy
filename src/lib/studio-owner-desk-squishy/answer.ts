/**
 * Squishy on the open Owner desk folder.
 * She explains the folder already on screen. She does not decide it.
 */

export type OwnerDeskSquishyFolder = {
  campaignName: string;
  title: string;
  squishySays: string;
  whyReached: string;
};

export type OwnerDeskSquishyTurn = {
  role: "owner" | "squishy";
  text: string;
};

export type OwnerDeskSquishyIntent = "brief" | "why" | "boundary" | "outside" | "repeat";

export const SQUISHY_OUTSIDE =
  "I can only answer from this folder. I will not guess a job status, a payment, or a decision.";

export const SQUISHY_BOUNDARY =
  "That decision is yours. I will not approve it or refuse it.";

export function stripPrivateDetails(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "")
    .replace(/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g, "")
    .replace(/\b\d{13,19}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clean(text: string): string {
  const stripped = stripPrivateDetails(text);
  return stripped || "";
}

export function answerOwnerDeskSquishy(input: {
  question: string;
  turns?: readonly OwnerDeskSquishyTurn[];
  folder: OwnerDeskSquishyFolder;
}): { say: string; intent: OwnerDeskSquishyIntent } {
  const says = clean(input.folder.squishySays);
  const why = clean(input.folder.whyReached) || says;
  const question = input.question.trim();
  const asked = question.toLowerCase();
  const lastSquishy = [...(input.turns ?? [])].reverse().find((turn) => turn.role === "squishy");

  if (/approv|deny|refus|grant the|decide for me|should i (approve|deny|refund)|just (approve|deny|refund)/i.test(asked)) {
    return { say: `${SQUISHY_BOUNDARY} ${says}`.trim(), intent: "boundary" };
  }
  if (/what did you say|say that again|repeat that/i.test(asked) && lastSquishy?.text.trim()) {
    return { say: clean(lastSquishy.text) || says, intent: "repeat" };
  }
  if (/why|how did|what happened|after that|and then/i.test(asked)) {
    return { say: why, intent: "why" };
  }
  if (
    /what do you need|what is this|what's this|whats this|tell me|what should i|help me|this folder/i.test(
      asked,
    )
  ) {
    return { say: says, intent: "brief" };
  }
  if (/^(huh|what|um|uh|sorry)\??$/i.test(asked) || asked.length < 4) {
    return { say: `This folder is waiting for your decision. ${says}`.trim(), intent: "brief" };
  }
  const haystack = `${input.folder.campaignName} ${input.folder.title} ${says} ${why}`.toLowerCase();
  const words = asked.split(/[^a-z0-9]+/).filter((word) => word.length > 3);
  const aboutFolder = words.some((word) => haystack.includes(word));
  if (!aboutFolder) return { say: SQUISHY_OUTSIDE, intent: "outside" };
  return { say: says, intent: "brief" };
}
