import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("work packet module boundary", () => {
  it("does not import the Node Kitchen production barrel", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/job-control/work-packets.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from ["']@\/lib\/studio-kitchen-production["']/);
  });
});
