import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import { evaluateArtifactBindings } from "./artifact-binding";

const ROOT = path.join(tmpdir(), `studio-wordmark-binding-${process.pid}`);

afterEach(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

describe("evaluateArtifactBindings wordmark-only", () => {
  it("requires identity source when the job uses a logo", () => {
    mkdirSync(ROOT, { recursive: true });
    const relativePath = "flyer.png";
    const bytes = Buffer.from("png");
    writeFileSync(path.join(ROOT, relativePath), bytes);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const missing = evaluateArtifactBindings({
      repoRoot: ROOT,
      artifacts: [
        {
          id: "flyer",
          relativePath,
          version: "final",
          extension: "png",
          declaredText: "Cedar & Bloom",
          contentSha256: hash,
        },
      ],
      requireBinding: true,
      requireIdentitySource: true,
    });
    expect(missing.ok).toBe(false);
    expect(missing.findings.some((finding) => finding.id.startsWith("bind_identity_source_"))).toBe(
      true,
    );
  });

  it("allows wordmark-only jobs to omit approvedIdentitySourceId when hash is bound", () => {
    mkdirSync(ROOT, { recursive: true });
    const relativePath = "flyer.png";
    const bytes = Buffer.from("png");
    writeFileSync(path.join(ROOT, relativePath), bytes);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const wordmark = evaluateArtifactBindings({
      repoRoot: ROOT,
      artifacts: [
        {
          id: "flyer",
          relativePath,
          version: "final",
          extension: "png",
          declaredText: "Cedar & Bloom",
          contentSha256: hash,
        },
      ],
      requireBinding: true,
      requireIdentitySource: false,
    });
    expect(wordmark.ok).toBe(true);
    expect(wordmark.findings).toHaveLength(0);
  });
});
