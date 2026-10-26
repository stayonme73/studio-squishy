import { describe, expect, it } from "vitest";

import {
  isPngImageBytes,
  minimalSyntheticPngBytes,
  validateImageFileBytes,
} from "./image-file-bytes";

describe("image file byte validation", () => {
  it("recognizes a minimal synthetic PNG", () => {
    const bytes = minimalSyntheticPngBytes();
    expect(isPngImageBytes(bytes)).toBe(true);
    expect(validateImageFileBytes("logo.png", "image/png", bytes)).toEqual({ ok: true });
  });

  it("rejects text bytes labeled as PNG", () => {
    const fake = new TextEncoder().encode("not-a-png\n");
    const result = validateImageFileBytes("logo.png", "image/png", fake);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not a readable PNG/i);
    }
  });
});
