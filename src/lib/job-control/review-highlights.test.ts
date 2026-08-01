import { describe, expect, it } from "vitest";

import {
  buildHighlightRecord,
  canHighlightOnDeliverable,
  filterHighlightsForProof,
  normalizeHighlightRect,
  upsertHighlightsForProof,
} from "./review-highlights";
import type { JobReviewHighlight } from "./review-feedback-types";

function highlight(
  overrides: Partial<JobReviewHighlight> &
    Pick<JobReviewHighlight, "id" | "deliverableKey" | "proofFileId">,
): JobReviewHighlight {
  return {
    jobId: "job:1",
    versionLabel: "v1",
    surface: "proof_markup_board_v1",
    rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-08-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("review-highlights (HIGHLIGHTER-1)", () => {
  it("requires at least one recorded proof", () => {
    expect(canHighlightOnDeliverable([])).toBe(false);
    expect(canHighlightOnDeliverable([{ id: "p1", versionLabel: "v1" }])).toBe(true);
  });

  it("normalizes rects and rejects degenerate geometry", () => {
    expect(normalizeHighlightRect({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 })).toEqual({
      x: 0.1,
      y: 0.2,
      w: 0.3,
      h: 0.4,
    });
    expect(normalizeHighlightRect({ x: 0.5, y: 0.5, w: 0, h: 0.2 })).toBeNull();
    expect(normalizeHighlightRect({ x: -1, y: 2, w: 0.5, h: 0.5 })).toBeNull();
  });

  it("binds highlights to deliverable + proof and isolates others", () => {
    const all = [
      highlight({ id: "a", deliverableKey: "d0", proofFileId: "p1" }),
      highlight({ id: "b", deliverableKey: "d0", proofFileId: "p2" }),
      highlight({ id: "c", deliverableKey: "d1", proofFileId: "p1" }),
    ];
    expect(
      filterHighlightsForProof(all, { deliverableKey: "d0", proofFileId: "p1" }).map(
        (entry) => entry.id,
      ),
    ).toEqual(["a"]);

    const next = upsertHighlightsForProof(
      all,
      [highlight({ id: "a2", deliverableKey: "d0", proofFileId: "p1", versionLabel: "v2" })],
      { deliverableKey: "d0", proofFileId: "p1" },
    );
    expect(next.map((entry) => entry.id).sort()).toEqual(["a2", "b", "c"]);
  });

  it("builds records only with valid proof identity and geometry", () => {
    expect(
      buildHighlightRecord({
        id: "h1",
        jobId: "job:1",
        deliverableKey: "d0",
        proofFileId: "proof:1",
        versionLabel: "v3",
        rects: [{ x: 0.05, y: 0.1, w: 0.4, h: 0.25 }],
        createdAt: "2026-08-01T12:00:00.000Z",
        updatedAt: "2026-08-01T12:00:00.000Z",
      }),
    ).toEqual(
      expect.objectContaining({
        proofFileId: "proof:1",
        versionLabel: "v3",
        surface: "proof_markup_board_v1",
        rects: [{ x: 0.05, y: 0.1, w: 0.4, h: 0.25 }],
      }),
    );
    expect(
      buildHighlightRecord({
        id: "h2",
        jobId: "job:1",
        deliverableKey: "d0",
        proofFileId: "",
        versionLabel: "v1",
        rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
      }),
    ).toBeNull();
  });
});
