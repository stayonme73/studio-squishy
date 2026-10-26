const TOKEN_STOP = new Set([
  "the",
  "a",
  "an",
  "is",
  "in",
  "and",
  "or",
  "of",
  "to",
  "i",
  "my",
  "you",
  "this",
  "that",
  "from",
  "as",
  "for",
  "with",
  "have",
  "has",
  "it",
  "on",
  "at",
  "just",
  "really",
  "very",
  "about",
]);

export function contentTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !TOKEN_STOP.has(word)),
  );
}
