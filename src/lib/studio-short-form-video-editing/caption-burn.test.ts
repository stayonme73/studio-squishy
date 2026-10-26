import { describe, expect, it } from "vitest";

import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";

import {
  assDialogueTexts,
  buildSpeechAss,
  evaluateExactTextQa,
  exactWords,
  fitSpeechCaptionsToFrame,
  paintExactTextLine,
  speechLineFitsFrame,
  stabilizeOpeningCaptionPresentation,
} from "./caption-burn";
import { applyCustomerEndCardHoldRevision } from "./revision";
import { TALKING_HEAD_INTAKE } from "./talking-head-fixture";
import { buildEditDecisionList } from "./edl";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

const FROZEN = studioShortFormVideoEditingBuildV1.frozenCherriesEditorial;

describe("Exact-text QA and local burn helpers", () => {
  it("fails closed on corrupted CTA or missing spaces", () => {
    const bad = evaluateExactTextQa({
      captions: [
        {
          start: 0,
          end: 2,
          text: "MyfavoritewordinEnglishis",
          role: "hook",
        },
        {
          start: 18,
          end: 21,
          text: "Readed theproject notes",
          role: "cta",
        },
      ],
      approvedCta: "Read the project notes",
      transcriptWordsInRange: exactWords("My favorite word in English is"),
    });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.findings).toContain("cta_not_exact");
  });

  it("holds the first spoken caption from frame zero without changing later text", () => {
    const stable = stabilizeOpeningCaptionPresentation([
      { start: 0.08, end: 4.56, text: "My name is Daniel. I am", role: "hook" },
      {
        start: 4.56,
        end: 8,
        text: "from The United States Of America,",
        role: "speech",
      },
      { start: 20, end: 22.5, text: "Visit thestudiocompany7.com", role: "cta" },
    ]);
    expect(stable[0]?.start).toBe(0);
    expect(stable[0]?.text).toBe("My name is Daniel. I am");
    expect(stable[1]?.start).toBe(4.56);
    expect(stable[2]?.start).toBe(20);
    expect(buildSpeechAss(stable)).toMatch(/0:00:00\.00/);
  });

  it("keeps ASS dialogue byte-equal to approved caption words", () => {
    const captions = [
      {
        start: 0,
        end: 5,
        text: "My favorite word in English is",
        role: "hook" as const,
      },
      {
        start: 5,
        end: 12,
        text: "cherries, which means a small fruit",
        role: "speech" as const,
      },
    ];
    const ass = buildSpeechAss(captions);
    expect(assDialogueTexts(ass)).toEqual([
      "My favorite word in English is",
      "cherries, which means a small fruit",
    ]);
    expect(evaluateExactTextQa({
      captions: [
        ...captions,
        {
          start: 18.7,
          end: 21.2,
          text: "Read the project notes",
          role: "cta",
        },
      ],
      approvedCta: "Read the project notes",
      transcriptWordsInRange: exactWords(
        "My favorite word in English is cherries, which means a small fruit",
      ),
    }).ok).toBe(true);
  });

  it("paints each approved word as its own sprite", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sfve-paint-"));
    const output = path.join(dir, "line.png");
    const painted = await paintExactTextLine({
      text: "Read the project notes",
      outputAbsolutePath: output,
      width: 1080,
      height: 160,
      fontSize: 48,
      fill: "#ffffff",
      background: "#1F4A44",
      radius: 16,
    });
    expect(painted.ok).toBe(true);
    if (!painted.ok) return;
    expect(painted.words).toEqual(["Read", "the", "project", "notes"]);
    expect(painted.wordGapPx).toBeGreaterThanOrEqual(20);
    expect(painted.sharedSpriteHeight).toBeGreaterThan(8);
    const mixed = await paintExactTextLine({
      text: "gym paying THE quality",
      outputAbsolutePath: path.join(dir, "mixed.png"),
      width: 1080,
      height: 160,
      fontSize: 44,
      fill: "#ffffff",
      background: "#111111",
      radius: 10,
    });
    expect(mixed.ok).toBe(true);
    if (!mixed.ok) return;
    expect(mixed.sharedSpriteHeight).toBe(Math.ceil(44 * 1.75));
  });

  it("splits a spoken line that cannot fit the frame and keeps the words", async () => {
    const text = "Just because a computer successfully creates";
    expect(await speechLineFitsFrame(text)).toBe(false);
    const fitted = await fitSpeechCaptionsToFrame([
      { start: 1, end: 4, text, role: "speech" },
      { start: 4, end: 7, text: "Visit the business site.", role: "cta" },
    ]);
    expect(Array.isArray(fitted)).toBe(true);
    if (!Array.isArray(fitted)) return;
    const speech = fitted.filter((caption) => caption.role !== "cta");
    expect(speech.length).toBeGreaterThan(1);
    expect(speech.map((caption) => caption.text).join(" ")).toBe(text);
    for (const caption of speech) {
      expect(await speechLineFitsFrame(caption.text)).toBe(true);
    }
    expect(fitted.find((caption) => caption.role === "cta")?.text).toBe(
      "Visit the business site.",
    );
  });

  it("extends the end-card without rewriting CTA words", () => {
    const edl = buildEditDecisionList({
      words: [
        { word: "favorite", start: 83.5, end: 84.2, punctuatedWord: "My" },
        { word: "cherries", start: 88.2, end: 90.1, punctuatedWord: "cherries," },
        {
          word: "delicious",
          start: 99.8,
          end: 100.66,
          punctuatedWord: "delicious.",
        },
      ],
      intake: { ...TALKING_HEAD_INTAKE, ctaText: "Read the project notes" },
      sourceDurationSeconds: 156,
      lockContinuousRange: {
        start: FROZEN.openingSourceSeconds,
        end: FROZEN.holdExitSourceSeconds,
      },
    });
    expect(edl.ok).toBe(true);
    if (!edl.ok) return;
    const revised = applyCustomerEndCardHoldRevision(edl, 4);
    const cta = revised.captions.find((caption) => caption.role === "cta");
    expect(cta?.text).toBe("Read the project notes");
    expect(cta?.end).toBeCloseTo((cta?.start ?? 0) + 4, 3);
    expect(revised.outputDurationSeconds).toBe(cta?.end);
  });
});
