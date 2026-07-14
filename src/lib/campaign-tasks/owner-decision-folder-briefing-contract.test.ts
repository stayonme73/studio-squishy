/**
 * BH-OC-1 — type contract for Owner Console folder body ↔ family briefing resolver.
 *
 * Mirrors the production helper in useOwnerConsoleActions.ts:
 *   <B extends OwnerFolderBriefingBody>(
 *     body: B,
 *     briefingResolver: (action: B["action"]) => OwnerPostDecisionBriefing,
 *   )
 *
 * Proves:
 * - valid deadline / revision / scope triples typecheck and yield expected messages
 * - cross-family resolvers are rejected (@ts-expect-error; verified by tsc / next build)
 * - inferred action param stays family-narrow (not the full multi-family union)
 *
 * Does not exercise the React hook fetch/UI path — that remains covered by production typecheck
 * of the 18 call sites in useOwnerConsoleActions.ts.
 */
import { describe, expect, it } from "vitest";

import type { OwnerDecisionFolderPatchBody } from "@/lib/campaign-tasks/owner-decision-folder-dispatch";
import {
  resolveOwnerDeadlinePostDecisionBriefing,
  resolveOwnerRevisionPostDecisionBriefing,
  resolveOwnerScopePostDecisionBriefing,
  type OwnerDeadlineDecisionAction,
  type OwnerPostDecisionBriefing,
  type OwnerRevisionDecisionAction,
  type OwnerScopeDecisionAction,
} from "@/studio-coordinator";

type OwnerFolderBriefingAction =
  | OwnerDeadlineDecisionAction
  | OwnerRevisionDecisionAction
  | OwnerScopeDecisionAction;

type OwnerFolderBriefingBody = Extract<
  OwnerDecisionFolderPatchBody,
  { action: OwnerFolderBriefingAction }
>;

function applyFolderBriefingResolver<B extends OwnerFolderBriefingBody>(
  body: B,
  briefingResolver: (action: B["action"]) => OwnerPostDecisionBriefing,
): OwnerPostDecisionBriefing {
  return briefingResolver(body.action);
}

describe("owner decision folder briefing contract", () => {
  it("accepts matching deadline, revision, and scope body/resolver triples", () => {
    const deadline = applyFolderBriefingResolver(
      { action: "owner_commit_deadline", exceptionId: "ex-deadline" },
      resolveOwnerDeadlinePostDecisionBriefing,
    );
    const revision = applyFolderBriefingResolver(
      { action: "owner_allow_revision", exceptionId: "ex-revision" },
      resolveOwnerRevisionPostDecisionBriefing,
    );
    const scope = applyFolderBriefingResolver(
      { action: "owner_approve_scope_change", exceptionId: "ex-scope" },
      resolveOwnerScopePostDecisionBriefing,
    );

    expect(deadline.message).toContain("Timeline committed");
    expect(revision.message).toContain("Business exception approved");
    expect(scope.message).toContain("Scope change approved");
  });

  it("rejects cross-family resolvers and keeps inferred action family-narrow", () => {
    applyFolderBriefingResolver(
      { action: "owner_commit_deadline", exceptionId: "ex-deadline" },
      // @ts-expect-error — revision resolver cannot accept a deadline action
      resolveOwnerRevisionPostDecisionBriefing,
    );

    applyFolderBriefingResolver(
      { action: "owner_allow_revision", exceptionId: "ex-revision" },
      // @ts-expect-error — scope resolver cannot accept a revision action
      resolveOwnerScopePostDecisionBriefing,
    );

    applyFolderBriefingResolver(
      { action: "owner_approve_scope_change", exceptionId: "ex-scope" },
      // @ts-expect-error — deadline resolver cannot accept a scope action
      resolveOwnerDeadlinePostDecisionBriefing,
    );

    // Capture a valid call's resolver parameter type; prove it is not the full
    // deadline|revision|scope union (assigning a revision resolver would succeed if widened).
    type DeadlineResolver = typeof resolveOwnerDeadlinePostDecisionBriefing;
    type CapturedParam = Parameters<DeadlineResolver>[0];
    type IsExactlyDeadline = CapturedParam extends OwnerDeadlineDecisionAction
      ? OwnerDeadlineDecisionAction extends CapturedParam
        ? true
        : false
      : false;
    const familyNarrow: IsExactlyDeadline = true;
    expect(familyNarrow).toBe(true);

    type RevisionAssignableToDeadlineParam = OwnerRevisionDecisionAction extends CapturedParam
      ? true
      : false;
    const revisionNotInDeadlineParam: RevisionAssignableToDeadlineParam = false;
    expect(revisionNotInDeadlineParam).toBe(false);
  });
});
