import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { studioAdCreativeOfferDefinitionAndCertV1 as pack } from "@/config/studio-ad-creative-offer-definition-and-cert-v1";
import type { AdCreativeIntake } from "./claims";
import { assembleAdTextCard, type AdTextCard } from "./ad-text";

export function adCreativeArtifactRootRel(campaignId: string): string {
  return `data/campaign-design-artifacts/${campaignId}/ad-creative-v1`;
}

export function writeAdCreativePackage(input: {
  repoRoot: string;
  intake: AdCreativeIntake;
  revision?: { headline?: string; cta?: string };
  graphicRels?: readonly string[];
}): {
  ok: true;
  rootRel: string;
  card: AdTextCard;
  files: readonly string[];
} | { ok: false; message: string } {
  const assembled = assembleAdTextCard(input.intake, input.revision);
  if (!assembled.ok) return assembled;

  const rootRel = adCreativeArtifactRootRel(input.intake.campaignId);
  const abs = path.join(input.repoRoot, rootRel);
  mkdirSync(abs, { recursive: true });

  const files = [
    "ad-text.txt",
    "ad-text.json",
    "account-boundary.txt",
    "whats-included.txt",
    "whats-not-included.txt",
  ];
  writeFileSync(path.join(abs, "ad-text.txt"), `${assembled.card.pasteReady}\n`, "utf8");
  writeFileSync(
    path.join(abs, "ad-text.json"),
    `${JSON.stringify(
      {
        headline: assembled.card.headline,
        primaryText: assembled.card.primaryText,
        cta: assembled.card.cta,
        disclosure: assembled.card.disclosure,
        graphics: input.graphicRels ?? [],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(abs, "account-boundary.txt"),
    `${pack.customerCopy.accountBoundary}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(abs, "whats-included.txt"),
    `${pack.customerCopy.included.join("\n")}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(abs, "whats-not-included.txt"),
    `${pack.customerCopy.notIncluded.join("\n")}\n`,
    "utf8",
  );

  return { ok: true, rootRel, card: assembled.card, files };
}
