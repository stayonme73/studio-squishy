import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { c8bReviewHandoffReceiptsV1 } from "@/config/c8b-review-handoff-receipts-v1";
import { studioCustomerReviewRoomSimplificationV1 as pack } from "@/config/studio-customer-review-room-simplification-v1";
import { studioReviewPhoneFeedbackToolsV1 as phoneTools } from "@/config/studio-review-phone-feedback-tools-v1";
import {
  createEmptyFeedbackSession,
  feedbackStudio,
} from "@/config/feedback-studio";
import {
  applyRevisionChangeDraft,
  buildPhoneRevisionSubmitSession,
  erasePhoneProofMarks,
  hasPhoneRevisionSendContent,
  resolveLaptopReviewDeskState,
  summarizeApprovalConfirmScope,
  summarizePhoneRevisionConfirm,
} from "@/lib/studio-review-revision/phone-revision-composer";

const SECTION = "hero" as const;
const here = dirname(fileURLToPath(import.meta.url));
const phoneDockSource = readFileSync(
  join(here, "../../components/feedback-studio/JobReviewPhoneCustomerDock.tsx"),
  "utf8",
);

function emptyJobSession() {
  return createEmptyFeedbackSession("camp-phone-review", "A", [SECTION]);
}

describe("phone customer Review Room simplification", () => {
  it("keeps Room 2 desktop Review strings unchanged", () => {
    expect(feedbackStudio.feedbackPanel.requestRevision).toBe(
      "Mark section for changes",
    );
    expect(feedbackStudio.feedbackPanel.requestRevisionJob).toBe(
      "Request a revision",
    );
    expect(feedbackStudio.feedbackPanel.addStickyNote).toBe("Add Sticky Note");
    expect(feedbackStudio.feedbackPanel.saveSticky).toBe("Place note");
    expect(feedbackStudio.feedbackPanel.textComment).toBe("Text Comment");
    expect(feedbackStudio.stickyNoteColors.yellow.label).toBe("Question");
    expect(feedbackStudio.stickyNoteColors.blue.label).toBe("Idea");
    expect(feedbackStudio.stickyNoteColors.coral.label).toBe("Revision Request");
    expect(c8bReviewHandoffReceiptsV1.confirmRevision.confirmCta).toBe(
      "Send revision request",
    );
    const phone = feedbackStudio.feedbackPanel.phoneCustomerRevision;
    expect(phone.confirmTitle).toBe("Confirm revision request");
    expect(phone.confirmLead("Version 8")).toBe(
      "You're requesting a revision of Version 8. This uses one included revision round.",
    );
    expect(phone.confirmRequestLabel).toBe("Your request");
    expect(phone.confirmDrawingAttachment).toBe("Drawing on the proof");
    expect(phone.confirmVoiceAttachment).toBe("Voice feedback");
    expect(phone.confirmCancel).toBe("Keep Reviewing");
    expect(phone.confirmSend).toBe("Send Revision Request");
  });

  it("centers the phone room on Approve / Request a Change / Ask The Studio", () => {
    const phone = feedbackStudio.feedbackPanel.phoneCustomerRevision;
    expect(pack.primaryActions).toEqual([
      phone.approve,
      phone.requestChange,
      phone.askStudio,
    ]);
    expect(phone.changeLabel).toBe("Tell us what you'd like changed.");
    expect(phone.optionalToolsHint).toBe(
      "You can also mark the proof or leave voice feedback.",
    );
    expect(phone.optionalToolsLabel).toBe("Optional");
    expect(phone.changePlaceholder).toBe("Type the change you want.");
    expect(phone.sendRevision).toBe("Send Revision Request");
    expect(phone.sendNeedsChange).toBe(
      "Type a change, draw on the proof, or leave voice feedback before sending.",
    );
    expect(phone.revisionRequested).toBe("Revision requested");
    expect(phone.revisionWorking).toBe(
      "The Studio is working on your changes.",
    );
    expect(phone.projectDetails).toBe("Project details");
    expect(phone.projectHistory).toBe("Project history");
    expect(phone.revisionGlance(1, 1)).toBe("1 revision included • 1 remaining");
    expect(phone.requestChange).not.toBe(
      feedbackStudio.feedbackPanel.requestRevision,
    );
    expect(phone.requestChange).not.toBe(
      feedbackStudio.feedbackPanel.requestRevisionJob,
    );
  });

  it("hides the phone revision form after send and when remaining is 0", () => {
    const phone = feedbackStudio.feedbackPanel.phoneCustomerRevision;
    expect(phone.revisionRequested).toBe("Revision requested");
    expect(phone.revisionWorking).toBe(
      "The Studio is working on your changes.",
    );
    expect(phoneDockSource).toContain("revisionWorking");
    expect(phoneDockSource).toContain("canOfferChange");
    expect(phoneDockSource).toContain("showChangePanel");
    expect(phoneDockSource).toContain("{showChangePanel ? (");
    expect(phoneDockSource).toContain("copy.sendNeedsChange");
    expect(phoneDockSource).toContain("!submitted && !canSendRevision");
    const workspace = readFileSync(
      join(here, "../../components/feedback-studio/JobReviewWorkspace.tsx"),
      "utf8",
    );
    expect(workspace).toContain(
      'submitted && review.spineStatus === "revision_requested"',
    );
    expect(workspace).toContain("accounting.remaining > 0");
    expect(workspace).toContain("if (!canOfferChange) return;");
  });

  it("offers Draw on proof and Voice feedback, with Erase only after drawing", () => {
    const phone = feedbackStudio.feedbackPanel.phoneCustomerRevision;
    expect(pack.changeTools).toEqual([
      phone.drawTool,
      phone.voiceTool,
    ]);
    expect(pack.changeTools).not.toContain(phone.erase);
    expect(pack.eraseAppearsAfterDrawing).toBe(true);
    expect(phoneTools.eraseAppearsAfterDrawing).toBe(true);
    expect(pack.changeTools).not.toContain(phone.stickyTool);
    expect(pack.changeTools).not.toContain(phone.highlightTool);
    expect(pack.hideFromCustomerTools).toEqual([
      "Sticky Note",
      "Highlight",
      "Text Comment",
      "Question",
      "Idea",
      "Revision Request",
      "Mark section for changes",
      "Place note",
    ]);
    expect(phoneDockSource).not.toContain("copy.stickyTool");
    expect(phoneDockSource).toContain("copy.voiceTool");
    expect(phoneDockSource).toContain("copy.drawTool");
    expect(phoneDockSource).toContain("hasDrawnMarks");
    expect(phoneDockSource).not.toContain("copy.highlightTool");
    expect(phoneDockSource).not.toContain("onHighlightToggle");
    expect(phoneDockSource).not.toContain("onStickyOpen");
    expect(phoneDockSource).not.toContain("textComment");
    expect(phoneDockSource).not.toContain("Text Comment");
    expect(phoneDockSource).not.toContain("Question");
    expect(phoneDockSource).not.toContain("Idea");
    expect(phoneDockSource).not.toContain("Revision Request");
    expect(phoneDockSource).not.toContain("Mark section for changes");
    expect(phoneDockSource).not.toContain("addDetail");
    expect(phoneDockSource).toContain("copy.erase");
    expect(phoneTools.oneEraserClearsNoteAndWriting).toBe(true);
    expect(phoneTools.removeStickyNote).toBe(true);
    expect(phoneTools.typingIsDefault).toBe(true);
    expect(phoneTools.removeHighlight).toBe(true);
    expect(phoneTools.changeTools).toEqual(pack.changeTools);
    expect(phoneTools.currentProofIsTheTarget).toBe(true);
    const previewSource = readFileSync(
      join(here, "../../components/feedback-studio/JobReviewDeliverablePreview.tsx"),
      "utf8",
    );
    const workspaceSource = readFileSync(
      join(here, "../../components/feedback-studio/JobReviewWorkspace.tsx"),
      "utf8",
    );
    expect(previewSource).toContain("fs-review-proof--draw");
    expect(previewSource).toContain("FeedbackStudioDrawLayer");
    expect(workspaceSource).toContain("stickyPlaceActive={false}");
    expect(workspaceSource).not.toContain(
      'document.querySelector(".fs-sticky--pending")?.scrollIntoView',
    );
    expect(workspaceSource).toContain("erasePhoneProofMarks");
  });

  it("keeps Version Compare optional and with phone-friendly copy", () => {
    expect(feedbackStudio.versionCompare.phoneLead).toMatch(/optional/i);
    expect(feedbackStudio.versionCompare.phoneLead).toMatch(
      /does not send a revision/i,
    );
    expect(feedbackStudio.feedbackPanel.phoneCustomerRevision.compareVersions).toBe(
      "Compare versions",
    );
  });

  it("laptop Review desk stays muted until a review asset exists, then Submit waits for valid input", () => {
    expect(
      resolveLaptopReviewDeskState({
        hasReviewAsset: false,
        submitted: false,
        reviewClosed: false,
        canRequestRevision: true,
        hasValidReviewInput: true,
      }),
    ).toEqual({ toolsUsable: false, submitActive: false, approveActive: false });

    expect(
      resolveLaptopReviewDeskState({
        hasReviewAsset: true,
        submitted: false,
        reviewClosed: false,
        canRequestRevision: true,
        hasValidReviewInput: false,
      }),
    ).toEqual({ toolsUsable: true, submitActive: false, approveActive: true });

    expect(
      resolveLaptopReviewDeskState({
        hasReviewAsset: true,
        submitted: false,
        reviewClosed: false,
        canRequestRevision: true,
        hasValidReviewInput: true,
      }),
    ).toEqual({ toolsUsable: true, submitActive: true, approveActive: true });
  });

  it("laptop Approve is usable without per-section controls and closes after submit or close", () => {
    const open = {
      hasReviewAsset: true,
      submitted: false,
      reviewClosed: false,
      canRequestRevision: false,
      hasValidReviewInput: false,
    };
    expect(resolveLaptopReviewDeskState(open).approveActive).toBe(true);
    expect(resolveLaptopReviewDeskState({ ...open, submitted: true }).approveActive).toBe(false);
    expect(resolveLaptopReviewDeskState({ ...open, reviewClosed: true }).approveActive).toBe(false);
  });

  it("laptop Approve uses the same approve-all-then-confirm path as the phone", () => {
    const workspace = readFileSync(
      join(here, "../../components/feedback-studio/JobReviewWorkspace.tsx"),
      "utf8",
    );
    const submitRow = workspace.slice(
      workspace.indexOf('className="rd-shell__submit-row"'),
      workspace.indexOf("<JobReviewPhoneCustomerDock"),
    );
    expect(submitRow).toContain("deskState.approveActive");
    expect(submitRow).toContain("handlePhoneApprove()");
    expect(submitRow).not.toContain("canApproveNow");
    expect(workspace).toContain("onApprove={handlePhoneApprove}");
  });

  it("flushing typed change creates coral revision feedback without Place note", () => {
    const session = emptyJobSession();
    expect(hasPhoneRevisionSendContent(session, "")).toBe(false);
    expect(
      hasPhoneRevisionSendContent(
        session,
        "Please make Call or visit more prominent as the headline.",
      ),
    ).toBe(true);

    const next = applyRevisionChangeDraft({
      session,
      focusedSection: SECTION,
      draft: "Please make Call or visit more prominent as the headline.",
      noteId: "sticky-phone-1",
      createdAt: "2026-09-12T00:00:00.000Z",
      anchorX: 0.42,
      anchorY: 0.18,
    });
    expect(next.sectionStatuses[SECTION]).toBe("revision");
    expect(next.stickyNotes).toHaveLength(1);
    expect(next.stickyNotes[0]?.color).toBe("yellow");
    expect(next.stickyNotes[0]?.text).toBe(
      "Please make Call or visit more prominent as the headline.",
    );
    expect(next.stickyNotes[0]?.anchorX).toBe(0.42);
    expect(next.stickyNotes[0]?.anchorY).toBe(0.18);
    expect(next.submittedAt).toBeNull();
  });

  it("does not duplicate the same typed change", () => {
    const first = applyRevisionChangeDraft({
      session: emptyJobSession(),
      focusedSection: SECTION,
      draft: "Please make Call or visit more prominent as the headline.",
      noteId: "sticky-phone-1",
      createdAt: "2026-09-12T00:00:00.000Z",
    });
    const second = applyRevisionChangeDraft({
      session: first,
      focusedSection: SECTION,
      draft: "Please make Call or visit more prominent as the headline.",
      noteId: "sticky-phone-2",
      createdAt: "2026-09-12T00:00:01.000Z",
    });
    expect(second.stickyNotes).toHaveLength(1);
  });

  it("Erase clears the note and drawing on this proof without sending", () => {
    const session = applyRevisionChangeDraft({
      session: {
        ...emptyJobSession(),
        drawSections: [SECTION],
      },
      focusedSection: SECTION,
      draft: "Make the headline larger.",
      noteId: "sticky-phone-1",
      createdAt: "2026-09-12T00:00:00.000Z",
      anchorX: 0.5,
      anchorY: 0.2,
    });
    const erased = erasePhoneProofMarks(session, SECTION);
    expect(erased.stickyNotes).toHaveLength(0);
    expect(erased.drawSections).toEqual([]);
    expect(erased.submittedAt).toBeNull();
  });

  it("keeps only this Request a Change session in the phone submit package", () => {
    const openedAt = "2026-09-12T04:58:00.000Z";
    const session = {
      ...emptyJobSession(),
      sectionStatuses: {
        hero: "revision" as const,
        rationale: "approved" as const,
      },
      stickyNotes: [
        {
          id: "sticky-old",
          sectionId: SECTION,
          color: "yellow" as const,
          text: "Leftover Builder QA note",
          createdAt: "2026-09-12T01:00:00.000Z",
        },
      ],
      voiceNotes: [
        {
          id: "voice-stale",
          sectionId: SECTION,
          durationSec: 1,
          createdAt: "2026-09-12T01:14:27.406Z",
        },
        {
          id: "voice-now",
          sectionId: SECTION,
          durationSec: 8,
          createdAt: "2026-09-12T04:58:12.000Z",
        },
      ],
      drawSections: [SECTION],
      highlights: [
        {
          id: "hl-stale",
          jobId: "camp-phone-review",
          deliverableKey: "hero",
          proofFileId: "proof-1",
          versionLabel: "Version 8",
          surface: "proof_markup_board_v1" as const,
          rects: [{ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }],
          createdAt: "2026-09-12T01:15:59.317Z",
          updatedAt: "2026-09-12T01:15:59.317Z",
        },
      ],
      textComments: [
        {
          id: "tc-stale",
          jobId: "camp-phone-review",
          deliverableKey: "hero",
          proofFileId: "proof-1",
          versionLabel: "Version 8",
          text: "legacy comment",
          createdAt: "2026-09-12T01:16:00.000Z",
          updatedAt: "2026-09-12T01:16:00.000Z",
        },
      ],
    };
    const next = buildPhoneRevisionSubmitSession({
      session,
      focusedSection: SECTION,
      draft: "Please make Call or visit more prominent as the headline.",
      changeOpenedAt: openedAt,
      noteId: "sticky-now",
      createdAt: "2026-09-12T04:59:23.734Z",
      includeDrawing: false,
    });
    expect(next.stickyNotes).toEqual([
      {
        id: "sticky-now",
        sectionId: SECTION,
        color: "yellow",
        text: "Please make Call or visit more prominent as the headline.",
        createdAt: "2026-09-12T04:59:23.734Z",
      },
    ]);
    expect(next.voiceNotes.map((note) => note.id)).toEqual(["voice-now"]);
    expect(next.drawSections).toEqual([]);
    expect(next.highlights).toEqual([]);
    expect(next.textComments).toEqual([]);
    expect(next.sectionStatuses.hero).toBe("revision");
    expect(next.sectionStatuses.rationale).toBe("neutral");
    expect(next.submittedAt).toBeNull();
    expect(summarizePhoneRevisionConfirm(next)).toEqual({
      requestText: "Please make Call or visit more prominent as the headline.",
      hasDrawing: false,
      hasVoice: true,
    });
  });

  it("paints Samsung Review chrome in the Studio palette without a second Help Center", () => {
    const css = readFileSync(
      join(here, "../../app/mobile-route-fixes.css"),
      "utf8",
    );
    expect(css).toContain(
      ".fs-page--review .utility-topbar__help",
    );
    expect(css).toContain(".fs-page--review .utility-topbar__end");
    expect(css).toContain("display: none !important");
    expect(css).toContain(".fs-page--review .utility-topbar__back");
    expect(css).toContain(".fs-page--review .utility-subnav__link");
    expect(css).toContain("min-height: 3.25rem");
    expect(phoneDockSource).toContain("SamsungDenimCta");
    expect(phoneDockSource).toContain("lobby-entry-film__cta");
    expect(css).toContain(".fs-phone-dock__btn--approve");
    expect(css).toContain("background: #05172f !important");
    expect(css).toContain("-webkit-appearance: none");
    expect(css).toContain("color: #547c92 !important");
    expect(css).not.toContain(
      ".fs-phone-dock__btn--approve,\n  [data-mobile-customer-spine] .fs-phone-dock__btn--approve.utility-btn--primary,\n  [data-mobile-customer-spine] .fs-phone-dock__btn--change,\n  [data-mobile-customer-spine] .fs-phone-dock__btn--ask,\n  [data-mobile-customer-spine] .fs-phone-dock__btn--selected {\n    color: #fff200 !important",
    );
    expect(css).toContain('.fs-page--review .utility-subnav__link[href="/studio-board"]');
    expect(css).toContain(".fs-review__phone-fold-summary");
    expect(css).toContain("color: #d94e2b !important");
    expect(css).toContain(".fs-page--review .fs-preview__title");
    expect(css).toContain(
      "var(--mc-board-color-card, var(--mc-eucalyptus, #456b5a))",
    );
    expect(css).toContain(".fs-phone-dock__btn--change");
    expect(css).toContain(".fs-phone-dock__erase");
    expect(css).toContain(".fs-phone-dock__send");
    expect(css).toContain(
      "color: var(--mc-board-color-card, var(--mc-eucalyptus, #456b5a)) !important",
    );
    expect(css).not.toContain(
      "[data-mobile-customer-spine] .fs-phone-dock__field {\n    background: #fff200 !important",
    );
    expect(css).toContain("scrollbar-width: none");
    expect(css).not.toContain("background: #ff9ac8 !important");
    expect(css).toContain(".fs-phone-dock__send:disabled");
    expect(css).toContain("opacity: 1 !important");
    expect(css).toContain(
      "color-mix(in srgb, #f7f4ee 68%, #ebe2d4 32%) 46%",
    );
    expect(css).toContain(
      "backdrop-filter: blur(14px) saturate(1.04) brightness(1.1) !important",
    );
    expect(css).toContain("blur(14px) saturate(1.04) brightness(1.1)");
    expect(css).toContain(".fs-review__phone-fold-summary::after");
    expect(css).toContain('content: "▸"');
    expect(css).toContain('content: "▾"');
    expect(css).not.toContain(".fs-phone-dock__btn--approve {\n    background: #2e2b28");
    expect(css).toContain(".fs-preview__section-body > .fs-sticky");
    expect(css).toContain(".fs-review-proof .fs-sticky");
    const workspace = readFileSync(
      join(here, "../../components/feedback-studio/JobReviewWorkspace.tsx"),
      "utf8",
    );
    expect(workspace).toContain("buildPhoneRevisionSubmitSession");
    expect(workspace).toContain("setChangeOpen(false)");
    expect(workspace).toContain("revisionWorking");
    expect(workspace).toContain("canOfferChange");
    expect(workspace).not.toContain("durationSec: fallbackSec");
    expect(phoneDockSource).toContain("copy.revisionRequested");
    expect(phoneDockSource).toContain("copy.revisionWorking");
    expect(phoneDockSource).toContain("showChangePanel");
    expect(phoneDockSource).toContain("canOfferChange && changeOpen");
    expect(css).toContain(".fs-phone-dock__status");
    const confirm = readFileSync(
      join(here, "../../components/feedback-studio/FeedbackStudioSubmitConfirm.tsx"),
      "utf8",
    );
    expect(confirm).toContain('surface === "phone"');
    expect(confirm).toContain("phoneCopy.confirmRequestLabel");
    expect(confirm).not.toContain("1 sticky note");
  });

  it("approval confirmation scope names the package and every item marked approved, in review order", () => {
    const scope = summarizeApprovalConfirmScope({
      packageName: "Example Package",
      visibleSectionIds: ["a", "b", "c"],
      sectionLabels: { a: "First item", b: "Second item", c: "Third item" },
      sectionStatuses: { c: "approved", a: "approved", b: "approved" },
    });
    expect(scope).toEqual({
      packageName: "Example Package",
      items: ["First item", "Second item", "Third item"],
    });
  });

  it("approval confirmation scope omits items not marked approved and hidden sections", () => {
    const scope = summarizeApprovalConfirmScope({
      packageName: "Example Package",
      visibleSectionIds: ["a", "b"],
      sectionLabels: { a: "First item", b: "Second item", z: "Hidden item" },
      sectionStatuses: { a: "approved", b: "neutral", z: "approved" },
    });
    expect(scope.items).toEqual(["First item"]);
  });

  it("shared approval confirmation renders the package row and the approved item list", () => {
    const confirm = readFileSync(
      join(here, "../../components/feedback-studio/FeedbackStudioSubmitConfirm.tsx"),
      "utf8",
    );
    const workspace = readFileSync(
      join(here, "../../components/feedback-studio/JobReviewWorkspace.tsx"),
      "utf8",
    );
    expect(confirm).toContain("approvalCopy.packageLabel");
    expect(confirm).toContain("approvalScope.packageName");
    expect(confirm).toContain("approvalScope.items.map");
    expect(workspace).toContain("approvalScope={approvalScope}");
    expect(c8bReviewHandoffReceiptsV1.confirmApproval.packageLabel).toBe("Package");
    expect(c8bReviewHandoffReceiptsV1.confirmApproval.itemsLabel).toBe("You are approving");
  });
});
