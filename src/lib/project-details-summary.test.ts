import { describe, expect, it } from "vitest";

import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";
import type { ProjectDetailsRecord } from "@/config/project-details";
import {
  RECORD_EMPTY_ANSWER,
  RECORD_MISSING_SECTION_TITLE,
} from "@/lib/project-record-client-copy";
import { buildProjectDetailsSummary } from "@/lib/project-details-summary";

const record: ProjectDetailsRecord = {
  form: {
    ...EMPTY_PROJECT_DETAILS_FORM,
    workingOn: "Spring launch",
    primaryApproverName: "Alex",
  },
  files: [],
  submittedAt: "2026-06-01T12:00:00.000Z",
};

describe("buildProjectDetailsSummary", () => {
  it("formats client-record audience with empty-answer normalization", () => {
    const sections = buildProjectDetailsSummary(record, ["bf-001"], "client-record");
    const workingOn = sections
      .find((section) => section.title === "What are we working on?")
      ?.items.find((item) => item.label === "What are we promoting or working on?");
    expect(workingOn?.value).toBe("Spring launch");
  });

  it("uses record missing-section title for client-record audience", () => {
    const sections = buildProjectDetailsSummary(record, ["bf-001"], "client-record");
    const missing = sections.find((section) => section.title === RECORD_MISSING_SECTION_TITLE);
    expect(missing?.items.some((item) => item.value === RECORD_EMPTY_ANSWER)).toBe(true);
  });

  it("formats file-room audience without empty-answer placeholders", () => {
    const sections = buildProjectDetailsSummary(record, ["bf-001"], "file-room");
    expect(sections.some((section) => section.title === RECORD_MISSING_SECTION_TITLE)).toBe(false);
    const missing = sections.find((section) => section.title === "Missing at submission");
    expect(missing?.items.some((item) => item.value === "Required")).toBe(true);
  });
});
