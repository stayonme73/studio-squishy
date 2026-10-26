import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { studioAiLocalVisibilityOfferDefinitionAndCertV1 as pack } from "@/config/studio-ai-local-visibility-offer-definition-and-cert-v1";
import { assembleLocalVisibilityPack } from "./assemble";
import type { LocalVisibilityIntake } from "./facts";

export function localVisibilityArtifactRootRel(campaignId: string): string {
  return `data/campaign-design-artifacts/${campaignId}/local-visibility-v1`;
}

export function writeLocalVisibilityPackage(input: {
  repoRoot: string;
  intake: LocalVisibilityIntake;
}):
  | { ok: true; rootRel: string; files: readonly string[] }
  | { ok: false; message: string } {
  const assembled = assembleLocalVisibilityPack(input.intake);
  if (!assembled.ok) return assembled;

  const rootRel = localVisibilityArtifactRootRel(input.intake.campaignId);
  const abs = path.join(input.repoRoot, rootRel);
  mkdirSync(abs, { recursive: true });

  writeFileSync(path.join(abs, "clarity-summary.txt"), `${assembled.pack.claritySummary}\n`, "utf8");
  writeFileSync(
    path.join(abs, "business-description.txt"),
    `${assembled.pack.businessDescription}\n`,
    "utf8",
  );
  writeFileSync(path.join(abs, "service-wording.txt"), `${assembled.pack.serviceWording}\n`, "utf8");
  writeFileSync(
    path.join(abs, "faq.txt"),
    `${assembled.pack.faqs.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join("\n\n")}\n`,
    "utf8",
  );
  writeFileSync(path.join(abs, "consistency-checklist.txt"), `${assembled.pack.checklist}\n`, "utf8");
  writeFileSync(
    path.join(abs, "implementation-guide.txt"),
    `${assembled.pack.implementationGuide}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(abs, "account-boundary.txt"),
    `${pack.customerCopy.accountBoundary}\n`,
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
    files: [
      "clarity-summary.txt",
      "business-description.txt",
      "service-wording.txt",
      "faq.txt",
      "consistency-checklist.txt",
      "implementation-guide.txt",
    ],
  };
}
