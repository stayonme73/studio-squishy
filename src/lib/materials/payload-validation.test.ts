import { describe, expect, it } from "vitest";

import {
  CLIENT_SUBMIT_TEXT_FIELDS,
  clientSubmitTextFieldValue,
  clientSubmitTextFieldsForKind,
  containsSecretLikeContent,
  validateClientSubmitPayload,
  type ClientSubmitPayload,
} from "./payload-validation";

const BOOLEAN_RIGHTS_FIELDS = [
  "cropAdaptPermitted",
  "commercialUsePermitted",
  "attributionRequired",
  "recognizablePeoplePresent",
  "likenessConsentConfirmed",
  "thirdPartyMaterialPresent",
  "thirdPartyRightsConfirmed",
] as const;

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

describe("materials intake text fields", () => {
  it("renders only text, url, and note", () => {
    expect(clientSubmitTextFieldsForKind("url")).toEqual(["url", "note"]);
    expect(clientSubmitTextFieldsForKind("file-metadata")).toEqual(["note"]);
    expect(clientSubmitTextFieldsForKind("text")).toEqual(["text", "note"]);
    expect(clientSubmitTextFieldsForKind("confirmation")).toEqual(["text", "note"]);
    for (const field of CLIENT_SUBMIT_TEXT_FIELDS) {
      expect(BOOLEAN_RIGHTS_FIELDS).not.toContain(field);
    }
  });

  it("keeps exact text and renders missing text as an empty string", () => {
    const payload: ClientSubmitPayload = {
      text: "  Harbor Oak  ",
      note: "",
      cropAdaptPermitted: false,
      commercialUsePermitted: false,
    };
    expect(clientSubmitTextFieldValue(payload, "text")).toBe("  Harbor Oak  ");
    expect(clientSubmitTextFieldValue(payload, "url")).toBe("");
    expect(clientSubmitTextFieldValue(payload, "note")).toBe("");
    expect(payload.cropAdaptPermitted).toBe(false);
    expect(payload.commercialUsePermitted).toBe(false);
  });

  it("does not treat a boolean false as submitted text", () => {
    const rejected = validateClientSubmitPayload(
      { cropAdaptPermitted: false, commercialUsePermitted: false },
      "text",
      "factual-confirmation",
    );
    expect(rejected.ok).toBe(false);
    const accepted = validateClientSubmitPayload(
      { text: "Hours are 9 to 5.", cropAdaptPermitted: false },
      "text",
      "factual-confirmation",
    );
    expect(accepted.ok).toBe(true);
    const empty = validateClientSubmitPayload({ text: "" }, "text", "factual-confirmation");
    expect(empty.ok).toBe(false);
  });
});
