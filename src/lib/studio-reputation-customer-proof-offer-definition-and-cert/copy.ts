import { studioReputationCustomerProofOfferDefinitionAndCertV1 as pack } from "@/config/studio-reputation-customer-proof-offer-definition-and-cert-v1";
import {
  evaluateReputationProofRights,
  normalizeQuote,
  type ReputationProofIntake,
} from "./rights";

export type ReputationProofCopy = {
  requestText: string;
  requestEmail: string;
  thankYou: string;
  responses: {
    positive: string;
    neutral: string;
    negative: string;
  };
  caption: string;
  useGuide: string;
  usedQuote: string;
};

export function assembleReputationProofCopy(
  intake: ReputationProofIntake,
): { ok: true; copy: ReputationProofCopy } | { ok: false; message: string } {
  const quote = normalizeQuote(intake.testimonial.exactQuote);
  const name = intake.testimonial.reviewerDisplayName.trim();
  const business = intake.businessName.trim();
  const dest = intake.reviewDestinationUrl.trim();
  const cta = intake.cta.trim();
  const disclosure = intake.requiredDisclaimer?.trim();

  const requestText = `Hi, this is ${business}. If you have a minute, please ${cta.toLowerCase()} here: ${dest}`;
  const requestEmail = [
    `Hello,`,
    ``,
    `Thank you for visiting ${business}. If you would like to share your experience, please ${cta.toLowerCase()} here:`,
    dest,
    disclosure ? `` : null,
    disclosure ?? null,
    ``,
    business,
  ]
    .filter((line) => line !== null)
    .join("\n");
  const thankYou = `Thank you for visiting ${business}. If you would like to share your experience, here is the review link: ${dest}`;
  const responses = {
    positive: `Thank you for sharing your experience with ${business}. We are glad you visited.`,
    neutral: `Thank you for sharing your experience with ${business}. If you want to tell us more, please contact us directly.`,
    negative: `Thank you for sharing your experience with ${business}. We are sorry you had that visit. Please contact us directly so we can hear more.`,
  };
  const caption = `"${quote}" — ${name}, customer of ${business}. ${cta}.`;
  const useGuide = [
    "1. Send the review-request text or email yourself. The Studio will not log in or send it.",
    "2. Print or show the QR card. It opens only the review link you supplied.",
    "3. Use the response templates when you reply in your own accounts.",
    "4. Post the quote graphics and caption only for the real customer wording you confirmed.",
    "5. Do not add star ratings, extra customers, or claims the Studio did not write.",
    pack.customerCopy.accountBoundary,
  ].join("\n");

  const studioVoice = [
    requestText,
    requestEmail,
    thankYou,
    responses.positive,
    responses.neutral,
    responses.negative,
    useGuide,
  ];
  const gate = evaluateReputationProofRights(intake, studioVoice, quote);
  if (!gate.ok) return { ok: false, message: gate.message };

  const captionGate = evaluateReputationProofRights(intake, [caption], quote);
  if (!captionGate.ok) return { ok: false, message: captionGate.message };

  return {
    ok: true,
    copy: {
      requestText,
      requestEmail,
      thankYou,
      responses,
      caption,
      useGuide,
      usedQuote: quote,
    },
  };
}
