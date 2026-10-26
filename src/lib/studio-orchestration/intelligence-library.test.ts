import { describe, expect, it } from "vitest";

import { libraryFor } from "@/lib/studio-orchestration/intelligence-library";

describe("creative intelligence library", () => {
  it("keeps owner-doctrine records marked for every job", () => {
    const records = libraryFor("static_design");
    const doctrine = records.filter((record) => record.media[0] === "all");
    expect(doctrine.length).toBeGreaterThan(0);
    expect(records.some((record) => record.media[0] === "static_design")).toBe(true);
  });
});
