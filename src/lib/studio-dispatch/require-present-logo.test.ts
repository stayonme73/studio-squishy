import { describe, expect, it } from "vitest";

import { requirePresentLogoMaterial } from "@/lib/studio-dispatch/map-flyer-job-truth";

describe("requirePresentLogoMaterial", () => {
  it("returns the same material when a logo file is already resolved", () => {
    const material = {
      materialId: "logo-1",
      role: "logo" as const,
      relativePath: "data/logo.png",
      contentSha256: "abc",
      approvedIdentitySourceId: "job-logo-1",
    };
    const result = requirePresentLogoMaterial({ ok: true, material });
    expect(result).toEqual({ ok: true, material });
  });

  it("does not invent a logo when no approved logo was resolved", () => {
    const result = requirePresentLogoMaterial({ ok: true, material: null });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("MISSING_REQUIRED_MATERIAL");
    expect(result).not.toHaveProperty("material");
  });

  it("keeps a broken approved path closed", () => {
    const blocked = {
      ok: false as const,
      code: "BROKEN_ASSET_REFERENCE" as const,
      message: "Logo material path missing on disk: data/logo.png",
    };
    expect(requirePresentLogoMaterial(blocked)).toEqual(blocked);
  });
});
