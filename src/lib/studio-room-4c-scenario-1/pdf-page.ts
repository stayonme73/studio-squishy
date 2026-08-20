/**
 * Read PDF page size from MediaBox. Used to prove US Letter output.
 */

import { readFileSync } from "fs";

export function readPdfMediaBoxPoints(absolutePath: string): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  const text = readFileSync(absolutePath).toString("latin1");
  const match = text.match(
    /\/MediaBox\s*\[\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\]/,
  );
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  const x2 = Number(match[3]);
  const y2 = Number(match[4]);
  if (![x, y, x2, y2].every((n) => Number.isFinite(n))) return null;
  return { x, y, width: x2 - x, height: y2 - y };
}

export function isUsLetterMediaBox(
  box: { width: number; height: number },
  tolerancePt = 0.75,
): boolean {
  return (
    Math.abs(box.width - 612) <= tolerancePt &&
    Math.abs(box.height - 792) <= tolerancePt
  );
}
