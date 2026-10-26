import type {
  Clip549DeliveredShort,
  Clip549HashtagKeywordSet,
  Clip549PostCaption,
  Clip549TitleHook,
} from "./copy";

export type Clip549PostingCompanion = {
  title: string;
  whatEachFileContains: readonly { fileName: string; contains: string }[];
  suggestedUseOrder: readonly string[];
  postingConsiderations: readonly string[];
  suggestionReminder: string;
  noPerformancePromises: readonly string[];
};

export function isClip549PostingCompanion(
  value: Clip549PostingCompanion | { ok: false; message: string },
): value is Clip549PostingCompanion {
  return !("ok" in value && value.ok === false);
}

export function writeClip549PostingCompanion(input: {
  delivered: readonly Clip549DeliveredShort[];
  captions: readonly Clip549PostCaption[];
  titles: readonly Clip549TitleHook[];
  discovery: readonly Clip549HashtagKeywordSet[];
}): Clip549PostingCompanion | { ok: false; message: string } {
  if (
    input.delivered.length !== input.captions.length ||
    input.delivered.length !== input.titles.length ||
    input.delivered.length !== input.discovery.length
  ) {
    return { ok: false, message: "Companion requires one extras row for each delivered short." };
  }
  return {
    title: "How to use this Clip Repurposing set",
    whatEachFileContains: input.delivered.map((short) => ({
      fileName: short.fileName,
      contains: `A finished vertical short (${short.durationLabel}) from this spoken moment: ${short.spokenIdea}`,
    })),
    suggestedUseOrder: input.delivered.map((short) => short.fileName),
    postingConsiderations: [
      "These files are ready to upload as vertical shorts. You post them from your own accounts.",
      "The Studio does not post, schedule, or manage comments for you.",
      "Keep the finished file as delivered. Do not stretch, crop, or add a second caption layer that covers the spoken words.",
      "If you make a cover on the platform, the title and hook lines can help you choose wording. This delivery does not include designed cover graphics.",
    ],
    suggestionReminder:
      "Titles, captions, hashtags, and keywords are suggestions. Use them, edit them, or set them aside. They describe the delivered shorts. They are not a posting strategy.",
    noPerformancePromises: [
      "best posting times",
      "analytics",
      "audience data",
      "reach, virality, ranking, or algorithm results",
      "traffic, engagement, sales, or other business outcomes",
    ],
  };
}

export function renderClip549CompanionMarkdown(guide: Clip549PostingCompanion): string {
  return [
    `# ${guide.title}`,
    "",
    "This companion is for the delivered set only. It is not strategy consulting.",
    "",
    "## What each file contains",
    "",
    ...guide.whatEachFileContains.map(
      (row, index) => `${index + 1}. \`${row.fileName}\` — ${row.contains}`,
    ),
    "",
    "## Suggested use order",
    "",
    "This is the order the shorts were selected. It is a simple reading order, not a performance ranking.",
    "",
    ...guide.suggestedUseOrder.map((fileName, index) => `${index + 1}. ${fileName}`),
    "",
    "## Basic posting considerations",
    "",
    ...guide.postingConsiderations.map((line) => `- ${line}`),
    "",
    guide.suggestionReminder,
    "",
    "This companion does not invent " +
      guide.noPerformancePromises.join(", ") +
      ".",
    "",
  ].join("\n");
}
