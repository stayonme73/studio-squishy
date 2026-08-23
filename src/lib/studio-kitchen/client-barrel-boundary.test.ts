import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("studio kitchen client barrel", () => {
  it("does not re-export Node folder builders into Client Component graphs", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/studio-kitchen/index.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from ["']\.\/build-folder["']/);
    expect(source).not.toMatch(/from ["']\.\/load-projection["']/);
  });
});
