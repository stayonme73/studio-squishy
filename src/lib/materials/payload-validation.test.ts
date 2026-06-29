import { describe, expect, it } from "vitest";

import { containsSecretLikeContent, validateClientSubmitPayload } from "./payload-validation";

describe("payload-validation", () => {
  it("detects password-like content", () => {
    expect(containsSecretLikeContent("My password is hunter2")).toBe(true);
    expect(containsSecretLikeContent("Logo file attached")).toBe(false);
  });

  it("rejects secret payloads for file metadata", () => {
    const result = validateClientSubmitPayload(
      { fileName: "logo.png", note: "api_key=abc123" },
      "file-metadata",
      "logo-brand",
    );
    expect(result.ok).toBe(false);
  });

  it("requires file name for metadata submissions", () => {
    const result = validateClientSubmitPayload({}, "file-metadata", "logo-brand");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/file name/i);
  });
});
