import { describe, expect, it } from "vitest";

import {
  RECORD_EMPTY_ANSWER,
  formatRecordFieldValue,
  isRecordEmptyAnswer,
} from "@/lib/project-record-client-copy";

describe("formatRecordFieldValue", () => {
  it("replaces internal empty placeholders with client-friendly copy", () => {
    expect(formatRecordFieldValue("")).toBe(RECORD_EMPTY_ANSWER);
    expect(formatRecordFieldValue("   ")).toBe(RECORD_EMPTY_ANSWER);
    expect(formatRecordFieldValue(null)).toBe(RECORD_EMPTY_ANSWER);
    expect(formatRecordFieldValue(undefined)).toBe(RECORD_EMPTY_ANSWER);
    expect(formatRecordFieldValue("NA")).toBe(RECORD_EMPTY_ANSWER);
    expect(formatRecordFieldValue("n/a")).toBe(RECORD_EMPTY_ANSWER);
    expect(formatRecordFieldValue("null")).toBe(RECORD_EMPTY_ANSWER);
    expect(formatRecordFieldValue("Not answered")).toBe(RECORD_EMPTY_ANSWER);
    expect(formatRecordFieldValue("Required")).toBe(RECORD_EMPTY_ANSWER);
  });

  it("preserves real submitted answers", () => {
    expect(formatRecordFieldValue("Client-led Social Posts walkthrough")).toBe(
      "Client-led Social Posts walkthrough",
    );
  });
});

describe("isRecordEmptyAnswer", () => {
  it("detects record empty labels", () => {
    expect(isRecordEmptyAnswer(RECORD_EMPTY_ANSWER)).toBe(true);
    expect(isRecordEmptyAnswer("No information provided")).toBe(true);
    expect(isRecordEmptyAnswer("Tagia")).toBe(false);
  });
});
