import { describe, expect, it } from "vitest";

import type { VersionCompareProof } from "./version-compare";
import {
  canCompareProofVersions,
  defaultComparePair,
  resolveVersionCompareSelection,
  sortProofsByAddedAtDesc,
} from "./version-compare";

function proof(
  overrides: Partial<VersionCompareProof> & Pick<VersionCompareProof, "id" | "versionLabel" | "addedAt">,
): VersionCompareProof {
  return {
    filename: `${overrides.id}.png`,
    fileType: "image/png",
    accessHref: `https://example.test/${overrides.id}`,
    ...overrides,
  };
}

describe("version-compare (VERSION-COMPARE-1)", () => {
  it("is unavailable with fewer than two recorded proofs", () => {
    expect(canCompareProofVersions([])).toBe(false);
    expect(canCompareProofVersions([proof({ id: "a", versionLabel: "v1", addedAt: "2026-07-01T00:00:00.000Z" })])).toBe(
      false,
    );
    expect(defaultComparePair([])).toBeNull();
    expect(
      resolveVersionCompareSelection([
        proof({ id: "a", versionLabel: "v1", addedAt: "2026-07-01T00:00:00.000Z" }),
      ]),
    ).toEqual({ status: "unavailable", reason: "insufficient_proofs" });
  });

  it("defaults to newest as current and next as prior without inventing labels", () => {
    const proofs = [
      proof({ id: "older", versionLabel: "v1", addedAt: "2026-07-01T10:00:00.000Z" }),
      proof({ id: "newer", versionLabel: "v2", addedAt: "2026-07-08T10:00:00.000Z" }),
      proof({ id: "mid", versionLabel: "v1.5", addedAt: "2026-07-04T10:00:00.000Z" }),
    ];

    const sorted = sortProofsByAddedAtDesc(proofs);
    expect(sorted.map((entry) => entry.id)).toEqual(["newer", "mid", "older"]);

    const pair = defaultComparePair(proofs);
    expect(pair).toEqual({
      current: expect.objectContaining({ id: "newer", versionLabel: "v2" }),
      prior: expect.objectContaining({ id: "mid", versionLabel: "v1.5" }),
    });

    const selection = resolveVersionCompareSelection(proofs);
    expect(selection.status).toBe("ready");
    if (selection.status !== "ready") return;
    expect(selection.current.versionLabel).toBe("v2");
    expect(selection.prior.versionLabel).toBe("v1.5");
    expect(selection.options).toHaveLength(3);
  });

  it("honors distinct selected proof ids from the recorded list only", () => {
    const proofs = [
      proof({ id: "a", versionLabel: "A", addedAt: "2026-07-01T00:00:00.000Z" }),
      proof({ id: "b", versionLabel: "B", addedAt: "2026-07-02T00:00:00.000Z" }),
      proof({ id: "c", versionLabel: "C", addedAt: "2026-07-03T00:00:00.000Z" }),
    ];

    const selection = resolveVersionCompareSelection(proofs, "a", "c");
    expect(selection.status).toBe("ready");
    if (selection.status !== "ready") return;
    expect(selection.current.id).toBe("a");
    expect(selection.prior.id).toBe("c");
  });

  it("falls back when a selected id is missing or both sides match", () => {
    const proofs = [
      proof({ id: "a", versionLabel: "A", addedAt: "2026-07-01T00:00:00.000Z" }),
      proof({ id: "b", versionLabel: "B", addedAt: "2026-07-02T00:00:00.000Z" }),
    ];

    const missing = resolveVersionCompareSelection(proofs, "missing", "a");
    expect(missing.status).toBe("ready");
    if (missing.status === "ready") {
      expect(missing.current.id).toBe("b");
      expect(missing.prior.id).toBe("a");
    }

    const same = resolveVersionCompareSelection(proofs, "b", "b");
    expect(same.status).toBe("ready");
    if (same.status === "ready") {
      expect(same.current.id).toBe("b");
      expect(same.prior.id).toBe("a");
    }
  });

  it("does not invent a second proof when only duplicates would remain", () => {
    const onlyOneDistinctId = [
      proof({ id: "same", versionLabel: "v1", addedAt: "2026-07-01T00:00:00.000Z" }),
      proof({ id: "same", versionLabel: "v1-dup", addedAt: "2026-07-02T00:00:00.000Z" }),
    ];
    // Array length is 2 but ids collide — treat as insufficient distinct proofs after resolve.
    const selection = resolveVersionCompareSelection(onlyOneDistinctId, "same", "same");
    expect(selection.status).toBe("unavailable");
  });
});
