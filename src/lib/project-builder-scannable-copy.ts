type ExpandScannableCopyOptions = {
  /** Split comma-separated exclusion lists into one bullet each. */
  splitCommas?: boolean;
};

function splitCommaList(segment: string): string[] | null {
  if (!segment.includes(",")) return null;

  const parts = segment
    .split(/,\s*(?:or\s+)?/i)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts : null;
}

/** Presentation-only — split catalog strings into scannable drawer bullets. */
export function expandScannableCopyItems(
  items: readonly string[],
  options: ExpandScannableCopyOptions = {},
): string[] {
  const expanded: string[] = [];

  for (const raw of items) {
    const segments = raw
      .split(/\s*;\s*/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    for (const segment of segments.length > 0 ? segments : [raw.trim()]) {
      if (!segment) continue;

      if (options.splitCommas) {
        const commaParts = splitCommaList(segment);
        if (commaParts) {
          expanded.push(...commaParts);
          continue;
        }
      }

      if (segment.includes(" — ")) {
        const [head, ...tail] = segment.split(/\s+—\s+/);
        if (head.trim()) expanded.push(head.trim());
        const remainder = tail.join(" — ").trim();
        if (remainder) expanded.push(remainder);
        continue;
      }

      expanded.push(segment);
    }
  }

  return expanded;
}
