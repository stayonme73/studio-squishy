/**
 * Current-door presentation for the post caption, cover, and posting guide.
 * The historical content-pack writers still echo a spoken idea. This door does not.
 * The finished video is not an input and is not rewritten here.
 */

import { createHash } from "crypto";
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

import { studioShortFormCurrentDoorContractV1 } from "@/config/studio-short-form-current-door-contract-v1";
import { paintPackCover, wrapCoverLines } from "@/lib/studio-short-form-content-pack/covers";

const CONTRACT = studioShortFormCurrentDoorContractV1;
const CTA_WORD = /\b(visit|book|call|click|tap|link)\b/i;
const OBSOLETE = /349|Content Pack|one revision/i;

export type CurrentDoorPresentation = {
  coverTitle: string;
  postCaption: string;
  postingGuide: string;
};

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function bareWords(text: string): string[] {
  return normalize(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(" ")
    .filter(Boolean);
}

function wordsStayInsideSpeech(copy: string, spokenIdea: string): boolean {
  const spoken = new Set(bareWords(spokenIdea));
  return bareWords(copy).every((word) => {
    if (spoken.has(word)) return true;
    if (word === "makes" || word === "made") return spoken.has("make") || spoken.has(word);
    return false;
  });
}

function captionBeats(sentence: string): string {
  const stripped = sentence
    .replace(/^You should be able to\s+/i, "")
    .replace(/[.!?]+$/g, "")
    .trim();
  if (!stripped) return "";
  const parts = stripped.split(/,\s+and\s+|,\s+/).map((part) => part.trim()).filter(Boolean);
  return parts
    .map((part) => {
      const cleaned = part.replace(/^and\s+/i, "").trim();
      const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
    })
    .join(" ");
}

export function composeCurrentDoorPresentation(input: {
  spokenIdea: string;
  ctaText: string;
  clipCount: number;
}): CurrentDoorPresentation | { ok: false; message: string } {
  const spoken = normalize(input.spokenIdea);
  if (!spoken) return { ok: false, message: "No spoken idea was available for the presentation." };
  const sentences = spoken.split(/(?<=[.!?])\s+/).filter(Boolean);
  const first = sentences[0] ?? spoken;
  const designed = first.match(
    /^(The studio) is designed to make (.+?) easier( for [^.]+)?\.?$/i,
  );
  const coverTitle = designed?.[2]
    ? `${designed[2].charAt(0).toUpperCase()}${designed[2].slice(1)}, made easier`
    : first
        .replace(/[.!?]+$/g, "")
        .split(" ")
        .slice(0, 6)
        .join(" ");
  if (coverTitle.length > 42 || coverTitle.split(" ").length > 6) {
    return { ok: false, message: "The cover title is still too long to function as a cover." };
  }
  const lead = designed
    ? `The studio makes ${designed[2]} easier${designed[3] ?? ""}.`
    : `${coverTitle}.`;
  const how = captionBeats(sentences.slice(1).join(" "));
  const postBody = how ? `${lead}\n\n${how}` : lead;
  const cta = input.ctaText.trim();
  const postCaption = cta ? `${postBody}\n\n${cta}` : postBody;
  if (normalize(postBody) === spoken) {
    return { ok: false, message: "The post caption is still the transcript." };
  }
  if (postBody.includes(first) && first.length > 40) {
    return { ok: false, message: "The post caption still pastes the spoken sentence." };
  }
  if (!wordsStayInsideSpeech(postBody, spoken) || !wordsStayInsideSpeech(coverTitle, spoken)) {
    return { ok: false, message: "The presentation added words the customer did not say." };
  }
  if (CTA_WORD.test(postBody) && !CTA_WORD.test(spoken)) {
    return { ok: false, message: "The post caption added a call to action the customer did not supply." };
  }
  if (cta && !postCaption.endsWith(cta)) {
    return { ok: false, message: "The post caption dropped the customer's call to action." };
  }
  const clipCount = input.clipCount;
  const setLine =
    clipCount === 1
      ? "This set has one finished vertical video, its cover, and its post caption."
      : `This set has ${clipCount} finished vertical videos, their covers, and their post captions. Post them in numbered order.`;
  const ctaLine = cta
    ? `End the post with these customer words: ${cta}`
    : "This set does not include a call to action.";
  const postingGuide = [
    `# ${CONTRACT.postingGuideTitle}`,
    "",
    setLine,
    "",
    "How to post:",
    "1. Use the finished vertical video as the post.",
    "2. Use the cover as the title image.",
    "3. Use the post caption as the words with that video.",
    "4. Publish the video, the cover, and the caption together.",
    "",
    ctaLine,
    "",
    "This guide does not invent best posting times, analytics, audience data, or performance predictions.",
    "",
    CONTRACT.completionLanguage,
    "",
  ].join("\n");
  if (OBSOLETE.test(postingGuide) || OBSOLETE.test(postCaption) || OBSOLETE.test(coverTitle)) {
    return { ok: false, message: "The presentation used obsolete package language." };
  }
  if (spoken.length > 40 && postingGuide.includes(spoken)) {
    return { ok: false, message: "The posting guide repeats the spoken transcript." };
  }
  if (first.length > 24 && postingGuide.includes(first.replace(/[.!?]+$/g, ""))) {
    return { ok: false, message: "The posting guide repeats the spoken sentence." };
  }
  return { coverTitle, postCaption, postingGuide };
}

export async function writeCurrentDoorPresentationFiles(input: {
  spokenIdea: string;
  ctaText: string;
  clipCount: number;
  clipId: string;
  setIndex: number;
  setCount: number;
  coverAbsolutePath: string;
  postCaptionAbsolutePath: string;
  guideAbsolutePath: string;
}): Promise<{ ok: true; presentation: CurrentDoorPresentation } | { ok: false; message: string }> {
  const presentation = composeCurrentDoorPresentation({
    spokenIdea: input.spokenIdea,
    ctaText: input.ctaText,
    clipCount: input.clipCount,
  });
  if ("ok" in presentation) return presentation;
  const cover = await paintPackCover({
    clipId: input.clipId,
    title: presentation.coverTitle,
    supportingLine: "",
    setIndex: input.setIndex,
    setCount: input.setCount,
    outputAbsolutePath: input.coverAbsolutePath,
    eyebrow: CONTRACT.coverEyebrow,
  });
  if ("ok" in cover) return cover;
  const titleLineCount = wrapCoverLines(presentation.coverTitle, 22).length;
  const work = path.dirname(input.coverAbsolutePath);
  for (const name of readdirSync(work)) {
    if (new RegExp(`^${input.clipId}-support-\\d+\\.png$`).test(name)) {
      unlinkSync(path.join(work, name));
    }
    const titleLayer = name.match(new RegExp(`^${input.clipId}-title-(\\d+)\\.png$`));
    if (titleLayer && Number(titleLayer[1]) >= titleLineCount) {
      unlinkSync(path.join(work, name));
    }
  }
  writeFileSync(input.postCaptionAbsolutePath, `${presentation.postCaption}\n`);
  writeFileSync(input.guideAbsolutePath, presentation.postingGuide);
  return { ok: true, presentation };
}

export async function reviseCurrentDoorPresentationOnDisk(input: {
  repoRoot: string;
  campaignId: string;
}): Promise<{ ok: true; presentation: CurrentDoorPresentation } | { ok: false; message: string }> {
  const workRoot = path.join(
    input.repoRoot,
    "data",
    "campaign-design-artifacts",
    input.campaignId,
    "short-form-candidate",
  );
  const videoAbs = path.join(workRoot, "production.mp4");
  const manifestAbs = path.join(workRoot, "manifest.json");
  const before = statSync(videoAbs);
  const beforeHash = createHash("sha256").update(readFileSync(videoAbs)).digest("hex");
  const manifest = JSON.parse(readFileSync(manifestAbs, "utf8")) as {
    spokenIdea?: string;
    video?: string;
  };
  const spokenIdea = manifest.spokenIdea?.trim() ?? "";
  const written = await writeCurrentDoorPresentationFiles({
    spokenIdea,
    ctaText: "",
    clipCount: 1,
    clipId: "clip-1",
    setIndex: 1,
    setCount: 1,
    coverAbsolutePath: path.join(workRoot, "cover.png"),
    postCaptionAbsolutePath: path.join(workRoot, "post-caption.txt"),
    guideAbsolutePath: path.join(workRoot, "use-guide.md"),
  });
  const after = statSync(videoAbs);
  const afterHash = createHash("sha256").update(readFileSync(videoAbs)).digest("hex");
  if (
    afterHash !== beforeHash ||
    after.size !== before.size ||
    after.mtimeMs !== before.mtimeMs
  ) {
    return { ok: false, message: "The passed video changed during the presentation revision." };
  }
  if (!written.ok) return written;
  const next = {
    ...JSON.parse(readFileSync(manifestAbs, "utf8")),
    coverTitle: written.presentation.coverTitle,
    presentationRevision: 1,
    qa: "presentation_revised_pending_qa",
  };
  writeFileSync(manifestAbs, `${JSON.stringify(next, null, 2)}\n`);
  return written;
}
