/**
 * Case is presentation. Wording is not.
 *
 * A composed line may set a fact in caps or sentence case without that counting as
 * rewriting the customer's copy, because the transform is declared on the element
 * and validation reapplies it to the truth value to check the result. Anything that
 * changes the words themselves fails.
 *
 * Sentence case delegates to the existing house helper rather than inventing a
 * second convention alongside it.
 */

import { sentenceCaseOffer } from "@/lib/studio-design-renderer/flyer-creative-quality";

export type PresentationCase = "as-is" | "upper" | "sentence";

export function applyPresentationCase(
  value: string,
  presentationCase: PresentationCase | undefined,
): string {
  const text = String(value ?? "");
  switch (presentationCase) {
    case "upper":
      return text.toUpperCase();
    case "sentence":
      return sentenceCaseOffer(text);
    default:
      return text;
  }
}
