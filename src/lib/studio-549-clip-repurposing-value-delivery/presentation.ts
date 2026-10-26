import type { Clip549PostingCompanion } from "./companion";
import type {
  Clip549DeliveredShort,
  Clip549HashtagKeywordSet,
  Clip549PostCaption,
  Clip549TitleHook,
} from "./copy";
import { clip549PathwayCopy } from "./pathway";

export type Clip549DeliveryIdentity = {
  customerName: string;
  projectName: string;
  orderLabel: string;
  deliveredOn: string;
  ctaText: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function renderClip549DeliveryHtml(input: {
  identity: Clip549DeliveryIdentity;
  delivered: readonly Clip549DeliveredShort[];
  captions: readonly Clip549PostCaption[];
  titles: readonly Clip549TitleHook[];
  discovery: readonly Clip549HashtagKeywordSet[];
  companion: Clip549PostingCompanion;
}): string {
  const pathway = clip549PathwayCopy();
  const shorts = input.delivered
    .map((short, index) => {
      const caption = input.captions[index]!;
      const title = input.titles[index]!;
      const tags = input.discovery[index]!;
      return `<article class="short" id="${escapeHtml(short.clipId)}">
  <p class="kicker">Short ${index + 1} of ${input.delivered.length}</p>
  <h3>${escapeHtml(title.text)}</h3>
  <p class="file"><a href="shorts/${escapeHtml(short.fileName)}">${escapeHtml(short.fileName)}</a> · ${escapeHtml(short.durationLabel)}</p>
  <video controls playsinline preload="metadata" src="shorts/${escapeHtml(short.fileName)}"></video>
  <h4>Matching post caption</h4>
  ${paragraphs(caption.text)}
  <h4>Suggested title / hook</h4>
  <p>${escapeHtml(title.text)}</p>
  <h4>Suggested hashtags and keywords</h4>
  <p class="tags">${tags.hashtags.map((tag) => escapeHtml(tag)).join(" ")}</p>
  <p class="keywords">${tags.keywords.map((word) => escapeHtml(word)).join(" · ")}</p>
</article>`;
    })
    .join("\n");

  const pathwayCards = pathway.services
    .map(
      (service) => `<article class="path">
  <h3>${escapeHtml(service.name)} <span>${escapeHtml(service.priceLabel)}</span></h3>
  <p>${escapeHtml(service.definition)}</p>
  <p>${escapeHtml(service.whatItProvides)}</p>
  <p>${escapeHtml(service.howItMayComplement)}</p>
</article>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Clip Repurposing delivery — ${escapeHtml(input.identity.projectName)}</title>
  <style>
    :root {
      --ink: #1c1712;
      --paper: #f6efe3;
      --panel: #fffaf1;
      --trim: #c4a36a;
      --mute: #5c5348;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--paper);
      font: 16px/1.55 "Iowan Old Style", "Palatino Linotype", Palatino, serif;
    }
    header, main, footer { width: min(880px, calc(100% - 32px)); margin: 0 auto; }
    header { padding: 36px 0 20px; border-bottom: 2px solid var(--trim); }
    .eyebrow { letter-spacing: 0.14em; text-transform: uppercase; font-size: 13px; color: var(--mute); }
    h1, h2, h3 { font-weight: 600; line-height: 1.25; }
    h1 { font-size: 32px; margin: 8px 0 12px; }
    h2 { font-size: 24px; margin-top: 40px; }
    h3 { font-size: 20px; }
    h4 { font-size: 16px; margin-bottom: 6px; color: var(--mute); }
    p { margin: 0 0 12px; }
    .panel, .short, .path {
      background: var(--panel);
      border: 1px solid rgba(196, 163, 106, 0.45);
      border-radius: 16px;
      padding: 18px 18px 10px;
      margin: 16px 0;
    }
    video { width: 100%; max-width: 360px; border-radius: 12px; background: #111; display: block; margin: 8px 0 16px; }
    a { color: var(--ink); }
    .file a { font-weight: 600; }
    .kicker { font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mute); }
    .tags, .keywords { font-size: 15px; }
    .path h3 span { font-size: 15px; color: var(--mute); font-weight: 500; }
    ul { padding-left: 20px; }
    footer { padding: 28px 0 48px; color: var(--mute); font-size: 14px; }
  </style>
</head>
<body>
  <header>
    <p class="eyebrow">The Studio</p>
    <h1>Your Clip Repurposing delivery</h1>
    <p>Thank you for trusting The Studio with this recording. We searched it, chose the strongest standalone moments, and finished the shorts below. This page is the delivery. The files are here. The copy is here. You should not have to hunt.</p>
    <p><strong>Customer:</strong> ${escapeHtml(input.identity.customerName)}<br />
    <strong>Project:</strong> ${escapeHtml(input.identity.projectName)}<br />
    <strong>Order:</strong> ${escapeHtml(input.identity.orderLabel)}<br />
    <strong>Delivered:</strong> ${escapeHtml(input.identity.deliveredOn)} · ${input.delivered.length} finished shorts</p>
  </header>
  <main>
    <section class="panel">
      <h2>What is included</h2>
      <ul>
        <li>${input.delivered.length} finished vertical MP4 shorts</li>
        <li>${input.captions.length} matching post captions</li>
        <li>${input.titles.length} suggested titles / hooks</li>
        <li>${input.discovery.length} suggested hashtag and keyword sets</li>
        <li>1 posting and use companion for the set</li>
        <li>1 included revision round for the set</li>
      </ul>
      <p>Designed cover graphics are not part of this delivery. Titles and hooks may help you choose or make a cover. The Studio did not post these files for you.</p>
    </section>
    <section>
      <h2>Final files</h2>
      <p>Open any short here, or save the file from the link. Everything lives in the <code>shorts</code> folder next to this page.</p>
      ${shorts}
    </section>
    <section class="panel">
      <h2>${escapeHtml(input.companion.title)}</h2>
      ${paragraphs(input.companion.suggestionReminder)}
      <h3>Suggested use order</h3>
      <ol>${input.companion.suggestedUseOrder.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ol>
      <h3>Basic posting considerations</h3>
      <ul>${input.companion.postingConsiderations.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
    </section>
    <section class="panel">
      <h2>Support and revisions</h2>
      <p>This Clip Repurposing order includes one revision round for the delivered set. A revision is a correction to the finished shorts or the supporting copy in this package. It is not a new search of the recording and it is not a new set of clips.</p>
      <p>If something in this delivery is wrong, reply on the project and name the file. The Help Center explains Studio policies in complete sentences.</p>
    </section>
    <section>
      <p class="eyebrow">${escapeHtml(pathway.eyebrow)}</p>
      <h2>${escapeHtml(pathway.title)}</h2>
      <p>${escapeHtml(pathway.lead)}</p>
      ${pathwayCards}
      <p>${escapeHtml(pathway.closing)}</p>
    </section>
  </main>
  <footer>
    The Studio · Clip Repurposing · ${escapeHtml(input.identity.orderLabel)}
  </footer>
</body>
</html>
`;
}
