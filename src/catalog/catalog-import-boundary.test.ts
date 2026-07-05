import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const SRC_ROOT = join(process.cwd(), "src");

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

const RAW_CATALOG_IMPORT = /from ["']@\/catalog\/services["']/;

describe("catalog import boundary", () => {
  it("only seeds/index.ts imports RAW_SERVICE_CATALOG from @/catalog/services", () => {
    const offenders: string[] = [];

    for (const file of collectSourceFiles(SRC_ROOT)) {
      const rel = relative(process.cwd(), file).replace(/\\/g, "/");
      if (rel === "src/catalog/services.ts") continue;

      const content = readFileSync(file, "utf8");
      if (RAW_CATALOG_IMPORT.test(content)) {
        offenders.push(rel);
      }
    }

    expect(offenders).toEqual(["src/catalog/seeds/index.ts"]);
  });
});
