import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { studioReputationCustomerProofOfferDefinitionAndCertV1 as pack } from "@/config/studio-reputation-customer-proof-offer-definition-and-cert-v1";
import { renderQuoteGraphicHtml, renderReviewCardHtml } from "./assets";
import { assembleReputationProofCopy, type ReputationProofCopy } from "./copy";
import type { ReputationProofIntake } from "./rights";

export function reputationProofArtifactRootRel(campaignId: string): string {
  return `data/campaign-design-artifacts/${campaignId}/reputation-proof-v1`;
}

export async function writeReputationProofPackage(input: {
  repoRoot: string;
  intake: ReputationProofIntake;
}): Promise<
  | {
      ok: true;
      rootRel: string;
      copy: ReputationProofCopy;
      files: readonly string[];
      destination: string;
    }
  | { ok: false; message: string }
> {
  const assembled = assembleReputationProofCopy(input.intake);
  if (!assembled.ok) return assembled;

  const card = await renderReviewCardHtml(input.intake);
  const square = renderQuoteGraphicHtml(input.intake, assembled.copy, pack.graphics.square);
  const portrait = renderQuoteGraphicHtml(input.intake, assembled.copy, pack.graphics.portrait);

  const rootRel = reputationProofArtifactRootRel(input.intake.campaignId);
  const abs = path.join(input.repoRoot, rootRel);
  mkdirSync(abs, { recursive: true });

  writeFileSync(path.join(abs, "review-request-text.txt"), `${assembled.copy.requestText}\n`, "utf8");
  writeFileSync(path.join(abs, "review-request-email.txt"), `${assembled.copy.requestEmail}\n`, "utf8");
  writeFileSync(path.join(abs, "thank-you.txt"), `${assembled.copy.thankYou}\n`, "utf8");
  writeFileSync(
    path.join(abs, "review-responses.txt"),
    [
      `POSITIVE\n${assembled.copy.responses.positive}`,
      `NEUTRAL\n${assembled.copy.responses.neutral}`,
      `NEGATIVE\n${assembled.copy.responses.negative}`,
    ].join("\n\n") + "\n",
    "utf8",
  );
  writeFileSync(path.join(abs, "caption.txt"), `${assembled.copy.caption}\n`, "utf8");
  writeFileSync(path.join(abs, "use-guide.txt"), `${assembled.copy.useGuide}\n`, "utf8");
  writeFileSync(path.join(abs, "review-card.html"), card.html, "utf8");
  writeFileSync(path.join(abs, "quote-square.html"), square, "utf8");
  writeFileSync(path.join(abs, "quote-portrait.html"), portrait, "utf8");
  writeFileSync(
    path.join(abs, "account-boundary.txt"),
    `${pack.customerCopy.accountBoundary}\n${pack.customerCopy.rightsBoundary}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(abs, "whats-not-included.txt"),
    `${pack.customerCopy.notIncluded.join("\n")}\n`,
    "utf8",
  );

  return {
    ok: true,
    rootRel,
    copy: assembled.copy,
    destination: card.destination,
    files: [
      "review-request-text.txt",
      "review-request-email.txt",
      "thank-you.txt",
      "review-responses.txt",
      "caption.txt",
      "use-guide.txt",
      "review-card.html",
      "quote-square.html",
      "quote-portrait.html",
    ],
  };
}
