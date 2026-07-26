/**
 * Minimal markdown → HTML for the temporary Launch Tracker.
 * Supports the Master Launch List subset only. No dependency.
 * Source is owner-controlled repo markdown — not customer input.
 */

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineFormat(text: string): string {
  let out = escapeHtml(text);
  // Links: [label](url) — allow relative docs and http(s) only
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
    const safeHref = href.trim();
    if (
      !safeHref.startsWith("/") &&
      !safeHref.startsWith("./") &&
      !safeHref.startsWith("../") &&
      !safeHref.startsWith("http://") &&
      !safeHref.startsWith("https://") &&
      !safeHref.startsWith("#")
    ) {
      return escapeHtml(`[${label}](${href})`);
    }
    return `<a href="${escapeHtml(safeHref)}">${label}</a>`;
  });
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  return out;
}

function isCommunicationHeading(text: string): boolean {
  return /^(Tagia Notes|Scout Notes|Decisions Needed|Blocker Notes|Daily Progress Notes|Communication Notebook)$/i.test(
    text.trim(),
  );
}

function isActiveHeading(text: string): boolean {
  return /CURRENTLY IN PROGRESS/i.test(text);
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; lines: string[] }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "checklist"; items: { checked: boolean; text: string }[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" }
  | { type: "code"; lang: string; body: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i] ?? "")) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      i += 1;
      blocks.push({ type: "code", lang, body: body.join("\n") });
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }

    if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*-+/.test(lines[i + 1] ?? "")) {
      const headerCells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|/.test(lines[i] ?? "")) {
        rows.push(
          (lines[i] ?? "")
            .split("|")
            .slice(1, -1)
            .map((cell) => cell.trim()),
        );
        i += 1;
      }
      blocks.push({ type: "table", headers: headerCells, rows });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i] ?? "")) {
        quote.push((lines[i] ?? "").replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "blockquote", lines: quote });
      continue;
    }

    if (/^[-*]\s+\[[ xX]\]\s+/.test(line)) {
      const items: { checked: boolean; text: string }[] = [];
      while (i < lines.length && /^[-*]\s+\[[ xX]\]\s+/.test(lines[i] ?? "")) {
        const match = /^[-*]\s+\[([ xX])\]\s+(.+)$/.exec(lines[i] ?? "");
        if (match) {
          items.push({
            checked: match[1].toLowerCase() === "x",
            text: match[2],
          });
        }
        i += 1;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i] ?? "") && !/^[-*]\s+/.test(lines[i] ?? "")) {
          const last = items[items.length - 1];
          if (last) last.text += ` ${ (lines[i] ?? "").trim() }`;
          i += 1;
        }
      }
      blocks.push({ type: "checklist", items });
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const items: string[] = [];
      while (
        i < lines.length &&
        (ordered ? /^\d+\.\s+/.test(lines[i] ?? "") : /^[-*]\s+/.test(lines[i] ?? ""))
      ) {
        items.push((lines[i] ?? "").replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ""));
        i += 1;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i] ?? "") && !/^[-*]|\d+\./.test((lines[i] ?? "").trim())) {
          items[items.length - 1] += ` ${(lines[i] ?? "").trim()}`;
          i += 1;
        }
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() !== "" &&
      !/^(#{1,6}\s|[-*]\s|\d+\.\s|>|```|\|)/.test(lines[i] ?? "") &&
      !/^---+$/.test((lines[i] ?? "").trim())
    ) {
      para.push(lines[i] ?? "");
      i += 1;
    }
    blocks.push({ type: "paragraph", text: para.join(" ") });
  }

  return blocks;
}

function renderBlock(block: Block): string {
  switch (block.type) {
    case "heading": {
      const level = Math.min(Math.max(block.level, 1), 6);
      const classes = [
        "lt-heading",
        `lt-heading--h${level}`,
        isCommunicationHeading(block.text) ? "lt-heading--notes" : "",
        isActiveHeading(block.text) ? "lt-heading--active" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const id = block.text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      return `<h${level} id="${escapeHtml(id)}" class="${classes}">${inlineFormat(block.text)}</h${level}>`;
    }
    case "paragraph":
      return `<p class="lt-p">${inlineFormat(block.text)}</p>`;
    case "blockquote":
      return `<blockquote class="lt-quote">${block.lines
        .map((line) => `<p>${inlineFormat(line)}</p>`)
        .join("")}</blockquote>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      return `<${tag} class="lt-list">${block.items
        .map((item) => `<li>${inlineFormat(item)}</li>`)
        .join("")}</${tag}>`;
    }
    case "checklist":
      return `<ul class="lt-checklist">${block.items
        .map((item) => {
          const cls = item.checked ? "lt-check lt-check--done" : "lt-check";
          const mark = item.checked ? "☑" : "☐";
          return `<li class="${cls}"><span class="lt-check__box" aria-hidden="true">${mark}</span><span class="lt-check__text">${inlineFormat(item.text)}</span></li>`;
        })
        .join("")}</ul>`;
    case "table": {
      const head = block.headers
        .map((cell) => `<th>${inlineFormat(cell)}</th>`)
        .join("");
      const body = block.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${inlineFormat(cell)}</td>`).join("")}</tr>`,
        )
        .join("");
      return `<div class="lt-table-wrap"><table class="lt-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    }
    case "hr":
      return `<hr class="lt-hr" />`;
    case "code":
      return `<pre class="lt-code"><code>${escapeHtml(block.body)}</code></pre>`;
    default:
      return "";
  }
}

/**
 * Convert Master Launch List markdown into HTML for the Launch Tracker view.
 * Redacts absolute local filesystem paths so they never appear in the owner browser view.
 */
export function renderLaunchMarkdown(markdown: string): string {
  const sanitized = redactAbsoluteLocalPaths(markdown);
  return parseBlocks(sanitized).map(renderBlock).join("\n");
}

/** Hide machine-local absolute paths from the temporary browser view. */
export function redactAbsoluteLocalPaths(markdown: string): string {
  return markdown
    .replace(/[A-Za-z]:\\[^\s|`"'<>]+/g, "`[local repo path]`")
    .replace(/\/(?:Users|home)\/[^\s|`"'<>]+/g, "`[local repo path]`");
}

/** Detect whether the markdown includes required communication notebook sections. */
export function launchMarkdownHasCommunicationSections(markdown: string): boolean {
  return (
    /##\s+Communication Notebook/i.test(markdown) &&
    /###\s+Tagia Notes/i.test(markdown) &&
    /###\s+Scout Notes/i.test(markdown) &&
    /###\s+Decisions Needed/i.test(markdown) &&
    /###\s+Blocker Notes/i.test(markdown) &&
    /###\s+Daily Progress Notes/i.test(markdown)
  );
}
