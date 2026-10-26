/**
 * Factory extras refresh after the CTA revision. Does not hand-edit clips.
 */
import { copyFileSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

import { studio349ShortFormContentPackOwnerUnusualCertV1 as cert } from "../src/config/studio-349-short-form-content-pack-owner-unusual-cert-v1";
import { paintPackCover } from "../src/lib/studio-short-form-content-pack/covers";
import {
  renderUseGuideMarkdown,
  writePackUseGuide,
} from "../src/lib/studio-short-form-content-pack/extras";
import { CONTENT_PACK_CERT_SCENARIO } from "../src/lib/studio-short-form-content-pack/scenario";

const repoRoot = process.cwd();
const deliveryDir = path.join(repoRoot, cert.stampDir, "delivery");
const ownerDir = path.join(repoRoot, cert.ownerHandoffDir);
const clips = [
  {
    clipId: "clip-01-intro",
    label: "Introduce myself",
    spokenIdea:
      "My name is Daniel. I am from The United States Of America, and I am speaking the English language. I learned this language from my parents as well as my community.",
  },
  {
    clipId: "clip-02-cherries",
    label: "Favorite English word: cherries",
    spokenIdea:
      "My favorite word in English is cherries, which means a small fruit that is delicious.",
  },
  {
    clipId: "clip-03-learned",
    label: "How I learned English",
    spokenIdea:
      "And I am speaking the English language. I learned this language from my parents, my family, and my neighbors and at school.",
  },
] as const;

async function main() {
  mkdirSync(deliveryDir, { recursive: true });
  mkdirSync(ownerDir, { recursive: true });
  for (const [index, clip] of clips.entries()) {
    const coverAbs = path.join(deliveryDir, `${clip.clipId}-cover.png`);
    const cover = await paintPackCover({
      clipId: clip.clipId,
      title: clip.label,
      supportingLine: clip.spokenIdea,
      setIndex: index + 1,
      setCount: clips.length,
      outputAbsolutePath: coverAbs,
    });
    if ("ok" in cover && cover.ok === false) {
      throw new Error(cover.message);
    }
  }
  const guide = writePackUseGuide({
    clipLabels: clips,
    ctaText: CONTENT_PACK_CERT_SCENARIO.ctaRevision,
  });
  if ("ok" in guide && guide.ok === false) {
    throw new Error(guide.message);
  }
  writeFileSync(path.join(deliveryDir, "use-guide.md"), renderUseGuideMarkdown(guide));
  writeFileSync(
    path.join(ownerDir, "post-captions.txt"),
    `${clips
      .map(
        (clip) =>
          `${clip.clipId}\n${clip.spokenIdea} ${CONTENT_PACK_CERT_SCENARIO.ctaRevision}`,
      )
      .join("\n\n")}\n`,
  );
  copyFileSync(path.join(deliveryDir, "use-guide.md"), path.join(ownerDir, "use-guide.md"));
  for (const clip of clips) {
    copyFileSync(
      path.join(deliveryDir, `${clip.clipId}-revised.mp4`),
      path.join(ownerDir, `${clip.clipId}.mp4`),
    );
    copyFileSync(
      path.join(deliveryDir, `${clip.clipId}-cover.png`),
      path.join(ownerDir, `${clip.clipId}-cover.png`),
    );
  }
  for (const name of readdirSync(ownerDir)) {
    const allowed = new Set([
      "clip-01-intro.mp4",
      "clip-02-cherries.mp4",
      "clip-03-learned.mp4",
      "clip-01-intro-cover.png",
      "clip-02-cherries-cover.png",
      "clip-03-learned-cover.png",
      "post-captions.txt",
      "use-guide.md",
      "CERTIFICATION-NOTE.md",
    ]);
    if (!allowed.has(name)) {
      unlinkSync(path.join(ownerDir, name));
    }
  }
  console.log(
    JSON.stringify(
      {
        extrasRefreshed: true,
        ownerHandoffRelativePath: cert.ownerHandoffDir,
        cta: CONTENT_PACK_CERT_SCENARIO.ctaRevision,
      },
      null,
      2,
    ),
  );
}

void main();
