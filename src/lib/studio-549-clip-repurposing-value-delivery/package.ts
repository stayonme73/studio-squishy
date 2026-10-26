import { copyFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { studio549ClipRepurposingValueDeliveryV1 as value } from "@/config/studio-549-clip-repurposing-value-delivery-v1";

import {
  renderClip549CompanionMarkdown,
  writeClip549PostingCompanion,
} from "./companion";
import {
  scaleClip549ValueLayer,
  type Clip549DeliveredShort,
} from "./copy";
import { estimateClip549ValueEconomics } from "./economics";
import { clip549PathwayCopy, pathwayMentionsUnfinishedOffer } from "./pathway";
import {
  renderClip549DeliveryHtml,
  type Clip549DeliveryIdentity,
} from "./presentation";

export type Clip549ValuePackageResult = {
  ok: true;
  deliveredCount: number;
  htmlRelativePath: string;
  companionRelativePath: string;
  captionsRelativePath: string;
  titlesRelativePath: string;
  hashtagsRelativePath: string;
  shortRelativePaths: string[];
  economicsSustainable: boolean;
};

export function assembleClip549ValuePackage(input: {
  repoRoot: string;
  outputDir: string;
  identity: Clip549DeliveryIdentity;
  delivered: readonly Clip549DeliveredShort[];
  sourceMp4AbsolutePaths: readonly string[];
}): Clip549ValuePackageResult | { ok: false; message: string } {
  if (input.delivered.length !== input.sourceMp4AbsolutePaths.length) {
    return { ok: false, message: "Each delivered short needs one source MP4." };
  }
  const layer = scaleClip549ValueLayer({
    delivered: input.delivered,
    ctaText: input.identity.ctaText,
  });
  if (!layer.ok) return layer;
  const companion = writeClip549PostingCompanion({
    delivered: input.delivered,
    captions: layer.captions,
    titles: layer.titles,
    discovery: layer.discovery,
  });
  if ("ok" in companion && companion.ok === false) return companion;
  const guide = companion as Exclude<
    ReturnType<typeof writeClip549PostingCompanion>,
    { ok: false; message: string }
  >;
  const html = renderClip549DeliveryHtml({
    identity: input.identity,
    delivered: input.delivered,
    captions: layer.captions,
    titles: layer.titles,
    discovery: layer.discovery,
    companion: guide,
  });
  const pathway = clip549PathwayCopy();
  const pathwayText = `${pathway.lead} ${pathway.services.map((row) => `${row.definition} ${row.whatItProvides} ${row.howItMayComplement}`).join(" ")} ${pathway.closing}`;
  if (pathwayMentionsUnfinishedOffer(pathwayText.replace(pathway.closing, ""))) {
    return { ok: false, message: "Pathway advertised an unfinished service as available now." };
  }
  if (html.includes("cover graphic") && /designed cover graphic/i.test(html) === false) {
    // Designed covers stay out. Mentioning their absence is required.
  }
  if (/\.png|\.jpg|cover-0/i.test(layer.captions.map((row) => row.text).join(" "))) {
    return { ok: false, message: "Value layer must not attach designed cover files." };
  }

  const shortsDir = path.join(input.outputDir, "shorts");
  const copyDir = path.join(input.outputDir, "copy");
  mkdirSync(shortsDir, { recursive: true });
  mkdirSync(copyDir, { recursive: true });

  const shortRelativePaths: string[] = [];
  for (const [index, short] of input.delivered.entries()) {
    const dest = path.join(shortsDir, short.fileName);
    copyFileSync(input.sourceMp4AbsolutePaths[index]!, dest);
    shortRelativePaths.push(`shorts/${short.fileName}`);
  }

  const captionsText = layer.captions
    .map((row) => `${row.clipId}\n${row.text}\n`)
    .join("\n");
  const titlesText = layer.titles
    .map((row) => `${row.clipId}\n${row.text}\n`)
    .join("\n");
  const hashtagsText = layer.discovery
    .map(
      (row) =>
        `${row.clipId}\n${row.hashtags.join(" ")}\n${row.keywords.join(", ")}\nThese are suggested descriptive terms. They do not promise reach, ranking, or results.\n`,
    )
    .join("\n");

  writeFileSync(path.join(input.outputDir, "index.html"), html, "utf8");
  writeFileSync(
    path.join(copyDir, "posting-companion.md"),
    renderClip549CompanionMarkdown(guide),
    "utf8",
  );
  writeFileSync(path.join(copyDir, "captions.txt"), captionsText, "utf8");
  writeFileSync(path.join(copyDir, "titles-hooks.txt"), titlesText, "utf8");
  writeFileSync(path.join(copyDir, "hashtags-keywords.txt"), hashtagsText, "utf8");

  const economics = estimateClip549ValueEconomics();
  if (!economics.sustainableAt549) {
    return { ok: false, message: "Value-layer economics failed. Stop and report to Owner." };
  }

  return {
    ok: true,
    deliveredCount: input.delivered.length,
    htmlRelativePath: "index.html",
    companionRelativePath: "copy/posting-companion.md",
    captionsRelativePath: "copy/captions.txt",
    titlesRelativePath: "copy/titles-hooks.txt",
    hashtagsRelativePath: "copy/hashtags-keywords.txt",
    shortRelativePaths,
    economicsSustainable: true,
  };
}

export function clip549ValueDoesNotPublish(): boolean {
  return value.doNotPublish && value.published === false && !value.designedCoverGraphics;
}
