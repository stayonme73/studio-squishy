import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import {
  CLIP_SOLD_RECERT_CAMPAIGN_ID,
  CLIP_SOLD_RECERT_REVISED_CTA,
  studioClipRepurposingFreshSoldContractRecertV1 as recert,
} from "@/config/studio-clip-repurposing-fresh-sold-contract-recert-v1";
import { assembleClip549ValuePackage } from "@/lib/studio-549-clip-repurposing-value-delivery/package";
import { clip549CustomerShortFileName } from "@/lib/studio-final-delivery-room/content";

function writeJson(abs: string, value: unknown) {
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const factoryDir = path.join(
    repoRoot,
    "data/campaign-design-artifacts",
    CLIP_SOLD_RECERT_CAMPAIGN_ID,
    "clip-factory",
  );
  const setAbs = path.join(factoryDir, "set-result.json");
  if (!existsSync(setAbs)) throw new Error("set-result.json is missing.");
  const set = JSON.parse(readFileSync(setAbs, "utf8")) as {
    files: Array<{ clipId: string; idea: string; relativePath: string }>;
  };
  const assembled = assembleClip549ValuePackage({
    repoRoot,
    outputDir: path.join(factoryDir, "customer-package"),
    identity: {
      customerName: recert.customerBusinessName,
      projectName: "Clip Repurposing",
      orderLabel: CLIP_SOLD_RECERT_CAMPAIGN_ID,
      deliveredOn: new Date().toISOString().slice(0, 10),
      ctaText: CLIP_SOLD_RECERT_REVISED_CTA,
    },
    delivered: set.files.map((file, index) => ({
      clipId: file.clipId,
      fileName: clip549CustomerShortFileName(index),
      spokenIdea: file.idea,
      durationLabel: "",
    })),
    sourceMp4AbsolutePaths: set.files.map((file) => path.join(repoRoot, file.relativePath)),
  });
  if (!assembled.ok) throw new Error(assembled.message);
  const captions = readFileSync(
    path.join(factoryDir, "customer-package/copy/captions.txt"),
    "utf8",
  );
  const titles = readFileSync(
    path.join(factoryDir, "customer-package/copy/titles-hooks.txt"),
    "utf8",
  );
  const html = readFileSync(path.join(factoryDir, "customer-package/index.html"), "utf8");
  const companion = readFileSync(
    path.join(factoryDir, "customer-package/copy/posting-companion.md"),
    "utf8",
  );
  const proof = {
    packageId: recert.packageId,
    campaignId: CLIP_SOLD_RECERT_CAMPAIGN_ID,
    revisedCta: CLIP_SOLD_RECERT_REVISED_CTA,
    captionsHaveRevisedCta: captions.includes(CLIP_SOLD_RECERT_REVISED_CTA),
    captionsHaveStaleCta: captions.includes("Book a Cole & Kindred consult"),
    htmlHasRevisedCta: html.includes(CLIP_SOLD_RECERT_REVISED_CTA),
    htmlHasStaleCta: html.includes("Book a Cole & Kindred consult"),
    titlesMentionCta: titles.includes("Book Cole") || titles.includes("Book a Cole"),
    companionMentionsCta:
      companion.includes("Book Cole") || companion.includes("Book a Cole"),
    assembled,
  };
  writeJson(
    path.join(repoRoot, recert.stampDir, "PACKAGE-COPY-REFRESH.json"),
    proof,
  );
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
