import { describe, expect, it } from "vitest";

import type { JobReviewTextComment } from "./review-feedback-types";
import {
  buildTextCommentRecord,
  canTextCommentOnDeliverable,
  filterTextCommentsForProof,
  removeTextComment,
  upsertTextComment,
} from "./review-text-comments";

function comment(
  overrides: Partial<JobReviewTextComment> & Pick<JobReviewTextComment, "id">,
): JobReviewTextComment {
  return {
    id: overrides.id,
    jobId: overrides.jobId ?? "job:1",
    deliverableKey: overrides.deliverableKey ?? "d0",
    proofFileId: overrides.proofFileId ?? "proof:a",
    versionLabel: overrides.versionLabel ?? "v1",
    text: overrides.text ?? "Note",
    createdAt: overrides.createdAt ?? "2026-08-01T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-08-01T12:00:00.000Z",
  };
}

describe("review-text-comments (TEXT-COMMENT-1)", () => {
  it("requires at least one recorded proof", () => {
    expect(canTextCommentOnDeliverable([])).toBe(false);
    expect(canTextCommentOnDeliverable([{ id: "p1", versionLabel: "v1" }])).toBe(
      true,
    );
  });

  it("isolates comments by deliverable, proof, and version", () => {
    const all = [
      comment({ id: "a", deliverableKey: "d0", proofFileId: "p1", versionLabel: "v1" }),
      comment({ id: "b", deliverableKey: "d0", proofFileId: "p1", versionLabel: "v2" }),
      comment({ id: "c", deliverableKey: "d0", proofFileId: "p2", versionLabel: "v1" }),
      comment({ id: "d", deliverableKey: "d1", proofFileId: "p1", versionLabel: "v1" }),
    ];
    expect(
      filterTextCommentsForProof(all, {
        deliverableKey: "d0",
        proofFileId: "p1",
        versionLabel: "v1",
      }).map((entry) => entry.id),
    ).toEqual(["a"]);
  });

  it("rejects empty text or missing proof identity", () => {
    expect(
      buildTextCommentRecord({
        id: "c1",
        jobId: "job:1",
        deliverableKey: "d0",
        proofFileId: "proof:1",
        versionLabel: "v1",
        text: "   ",
      }),
    ).toBeNull();
    expect(
      buildTextCommentRecord({
        id: "c2",
        jobId: "job:1",
        deliverableKey: "d0",
        proofFileId: "",
        versionLabel: "v1",
        text: "Hello",
      }),
    ).toBeNull();
  });

  it("upserts and removes without leaking other bindings", () => {
    const base = [
      comment({ id: "keep", proofFileId: "p2" }),
      comment({ id: "old", text: "old" }),
    ];
    const next = upsertTextComment(
      base,
      comment({ id: "old", text: "updated", updatedAt: "2026-08-01T13:00:00.000Z" }),
    );
    expect(next.find((entry) => entry.id === "old")?.text).toBe("updated");
    expect(next.find((entry) => entry.id === "keep")).toBeTruthy();
    expect(removeTextComment(next, "old").map((entry) => entry.id)).toEqual([
      "keep",
    ]);
  });
});
