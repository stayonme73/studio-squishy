import { describe, expect, it } from "vitest";

import { readProjectIntakeAnswer } from "@/lib/project-intake-plan";

describe("intake answer key prefix", () => {
  it("reads a workforce SKU prefix without treating it as a catalog service id", () => {
    const answers = { "v2-rtu-flyer:businessName": "Harbor Oak" };
    expect(readProjectIntakeAnswer(answers, "businessName", "v2-rtu-flyer")).toBe("Harbor Oak");
  });

  it("reads the current short-form package prefix", () => {
    const answers = { "short_form_video_editing:cta": "Book today" };
    expect(readProjectIntakeAnswer(answers, "cta", "short_form_video_editing")).toBe("Book today");
  });
});
