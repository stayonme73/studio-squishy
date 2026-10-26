"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import FeedbackStudioCorrectionAccounting from "@/components/feedback-studio/FeedbackStudioCorrectionAccounting";
import FeedbackStudioFeedbackPanel from "@/components/feedback-studio/FeedbackStudioFeedbackPanel";
import FeedbackStudioHandoffStatus from "@/components/feedback-studio/FeedbackStudioHandoffStatus";
import FeedbackStudioUpdateHistory from "@/components/feedback-studio/FeedbackStudioUpdateHistory";
import FeedbackStudioLockedPackageReceipt from "@/components/feedback-studio/FeedbackStudioLockedPackageReceipt";
import FeedbackStudioRevisionStatus from "@/components/feedback-studio/FeedbackStudioRevisionStatus";
import FeedbackStudioSubmissionReceipt from "@/components/feedback-studio/FeedbackStudioSubmissionReceipt";
import FeedbackStudioSubmitConfirm from "@/components/feedback-studio/FeedbackStudioSubmitConfirm";
import JobReviewDeliverablePreview from "@/components/feedback-studio/JobReviewDeliverablePreview";
import JobReviewPhoneCustomerDock from "@/components/feedback-studio/JobReviewPhoneCustomerDock";
import StudioBoardProjectCommunicationSection from "@/components/studio-board/StudioBoardProjectCommunicationSection";
import StudioExtrasPanel from "@/components/studio-extras/StudioExtrasPanel";
import type {
  FeedbackSectionId,
  FeedbackSession,
  FeedbackTool,
  StickyNoteColorId,
} from "@/config/feedback-studio";
import { feedbackStudio, isJobReviewClosedSpine, resolveFeedbackSectionLabel } from "@/config/feedback-studio";
import { PROJECT_COMMUNICATION_CUSTOMER_V1 } from "@/config/project-communication-customer-v1";
import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import {
  buildFeedbackPackageInventory,
  buildLockedFeedbackPackageReceipt,
  buildStudioSubmissionReceipt,
} from "@/lib/job-control/review-handoff-receipts";
import type { ClientReviewView } from "@/lib/job-control/review-room-view";
import { sortProofsByAddedAtDesc } from "@/lib/job-control/version-compare";
import { hasClientRevisionIntent, canApproveJobForDelivery } from "@/lib/job-control/review-room-gates";
import {
  deliverableKeyToSectionId,
  feedbackSessionToJobReviewFeedback,
  jobReviewFeedbackToFeedbackSession,
  patchJobReview,
} from "@/lib/review-room-client";
import {
  buildPhoneRevisionSubmitSession,
  erasePhoneProofMarks,
  hasPhoneRevisionSendContent,
  resolveLaptopReviewDeskState,
  summarizeApprovalConfirmScope,
  summarizePhoneRevisionConfirm,
  type PhoneRevisionConfirmSummary,
} from "@/lib/studio-review-revision/phone-revision-composer";

type Props = {
  review: ClientReviewView;
  campaign: CampaignRecord | null;
  onReviewUpdated: (review: ClientReviewView) => void;
};

/** Job-scoped Review Room workspace — real deliverables from Production Workspace. */
export default function JobReviewWorkspace({ review, campaign, onReviewUpdated }: Props) {
  const sectionLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const deliverable of review.deliverables) {
      labels[deliverableKeyToSectionId(deliverable.key)] = deliverable.label;
    }
    return labels;
  }, [review.deliverables]);

  const visibleSectionIds = useMemo(
    () => review.deliverables.map((d) => deliverableKeyToSectionId(d.key)),
    [review.deliverables],
  );

  const [session, setSession] = useState<FeedbackSession>(() =>
    jobReviewFeedbackToFeedbackSession(review),
  );
  const [focusedSection, setFocusedSection] = useState<FeedbackSectionId>(
    visibleSectionIds[0] ?? "fallback:deliverable-0",
  );
  const [activeTool, setActiveTool] = useState<FeedbackTool>("none");
  const [compareCurrentId, setCompareCurrentId] = useState<string | null>(null);
  const [comparePriorId, setComparePriorId] = useState<string | null>(null);
  const [highlightProofId, setHighlightProofId] = useState<string | null>(null);
  const [textCommentProofId, setTextCommentProofId] = useState<string | null>(null);
  const [stickyOpen, setStickyOpen] = useState(false);
  const [composerKind, setComposerKind] = useState<"none" | "revision" | "sticky">("none");
  const [changeOpen, setChangeOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [stickyColor, setStickyColor] = useState<StickyNoteColorId>("yellow");
  const [stickyDraft, setStickyDraft] = useState("");
  const [pendingStickyAnchor, setPendingStickyAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [drawResetKey, setDrawResetKey] = useState(0);
  const [erasing, setErasing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<"revision" | "approval" | null>(
    null,
  );
  const [phoneSurface, setPhoneSurface] = useState(false);
  const [phoneConfirmSummary, setPhoneConfirmSummary] =
    useState<PhoneRevisionConfirmSummary | null>(null);
  const [extraDrafts, setExtraDrafts] = useState<Record<string, string>>({});
  const [extrasRefreshKey, setExtrasRefreshKey] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStartRef = useRef<number>(0);
  const recordTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const receiveAckRef = useRef<string | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const phoneChangeOpenedAtRef = useRef<string | null>(null);
  const phoneDrewThisChangeRef = useRef(false);
  const draftKey = `${review.jobId}:${review.feedback.packageId ?? "open"}`;
  const draftKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const incoming = jobReviewFeedbackToFeedbackSession(review);
    const keyChanged = draftKeyRef.current !== draftKey;
    const submitted = Boolean(review.feedback.submittedAt);
    if (!draftKeyRef.current || keyChanged || submitted) {
      draftKeyRef.current = draftKey;
      setSession(incoming);
      setFocusedSection((current) =>
        visibleSectionIds.some((id) => id === current)
          ? current
          : (visibleSectionIds[0] ?? "fallback:deliverable-0"),
      );
    }
  }, [draftKey, review, visibleSectionIds]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1024px)");
    const sync = () => setPhoneSurface(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // C8b — record authorized customer open via authenticated POST (not GET/prefetch).
  useEffect(() => {
    if (receiveAckRef.current === review.jobId) return;
    if (review.feedback.submittedAt) return;
    if (review.spineStatus !== "ready_for_review") return;

    receiveAckRef.current = review.jobId;
    let cancelled = false;

    void (async () => {
      try {
        const result = await patchJobReview(review.campaignId, review.jobId, {
          action: "acknowledge_review_received",
        });
        if (!cancelled && result.review) {
          onReviewUpdated(result.review);
        }
      } catch {
        // Soft-fail: receipt stamp must never block review tools.
        if (!cancelled) receiveAckRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [review, onReviewUpdated]);

  const flashSaveNotice = useCallback((message: string) => {
    setSaveNotice(message);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setSaveNotice(null), 3200);
  }, []);

  const persistToServer = useCallback(
    async (nextSession: FeedbackSession) => {
      setSession(nextSession);
      const feedback = feedbackSessionToJobReviewFeedback(nextSession, review);
      try {
        const result = await patchJobReview(review.campaignId, review.jobId, {
          action: "save_feedback",
          feedback,
        });
        if (result.review) {
          onReviewUpdated(result.review);
        }
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Save failed");
      }
    },
    [review, onReviewUpdated],
  );

  const debouncedPersist = useCallback(
    (nextSession: FeedbackSession) => {
      setSession(nextSession);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        void persistToServer(nextSession);
      }, 400);
    },
    [persistToServer],
  );

  const focusedSectionLabel = resolveFeedbackSectionLabel(focusedSection, sectionLabels);
  const submitted = Boolean(session.submittedAt);
  const localFeedback = feedbackSessionToJobReviewFeedback(session, review);
  const canRequestRevisionNow =
    !submitted &&
    (review.canRequestRevision || hasClientRevisionIntent(localFeedback));
  const canApproveNow =
    !submitted &&
    (review.canApproveForDelivery ||
      canApproveJobForDelivery({
        job: { spineStatus: review.spineStatus } as never,
        feedback: localFeedback,
        allDeliverablesPrepared: true,
        deliverableCount: review.deliverables.length,
      }).allowed);
  const accounting = review.correctionAccounting;
  const revisionStatus =
    accounting.remaining <= 0
      ? feedbackStudio.reviewStatus.finalRound
      : feedbackStudio.reviewStatus.roundOf(
          Math.min(accounting.effectiveUsed + 1, accounting.included),
          accounting.included,
        );

  function markDraw(sectionId: FeedbackSectionId) {
    if (changeOpen) phoneDrewThisChangeRef.current = true;
    if (session.drawSections.includes(sectionId)) return;
    debouncedPersist({ ...session, drawSections: [...session.drawSections, sectionId] });
  }

  function handleApprove() {
    debouncedPersist({
      ...session,
      sectionStatuses: { ...session.sectionStatuses, [focusedSection]: "approved" },
    });
    flashSaveNotice(feedbackStudio.feedbackPanel.saved.approve(focusedSectionLabel));
  }

  function handleRevision() {
    debouncedPersist({
      ...session,
      sectionStatuses: { ...session.sectionStatuses, [focusedSection]: "revision" },
    });
    flashSaveNotice(feedbackStudio.feedbackPanel.saved.revision(focusedSectionLabel));
  }

  function handleSkip() {
    debouncedPersist({
      ...session,
      sectionStatuses: { ...session.sectionStatuses, [focusedSection]: "skip" },
    });
    flashSaveNotice(feedbackStudio.feedbackPanel.saved.skip(focusedSectionLabel));
  }

  const phoneCopy = feedbackStudio.feedbackPanel.phoneCustomerRevision;
  const revisionWorking =
    submitted && review.spineStatus === "revision_requested";
  const canOfferChange =
    !submitted && accounting.remaining > 0 && !revisionWorking;
  const phoneCanSend =
    canOfferChange &&
    canRequestRevisionNow &&
    hasPhoneRevisionSendContent(session, stickyDraft);

  useEffect(() => {
    if (!canOfferChange && changeOpen) {
      setChangeOpen(false);
      setActiveTool("none");
      setPendingStickyAnchor(null);
      setStickyOpen(false);
      setErasing(false);
    }
  }, [canOfferChange, changeOpen]);

  function handlePhoneRequestChange() {
    if (!canOfferChange) return;
    if (changeOpen) {
      setChangeOpen(false);
      setActiveTool("none");
      setPendingStickyAnchor(null);
      setStickyOpen(false);
      setErasing(false);
      return;
    }
    phoneChangeOpenedAtRef.current = new Date().toISOString();
    phoneDrewThisChangeRef.current = false;
    if (!stickyDraft.trim()) {
      const lastNote = [...session.stickyNotes]
        .filter((note) => note.text.trim())
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .at(-1);
      if (lastNote) setStickyDraft(lastNote.text);
    }
    setStickyColor("yellow");
    setComposerKind("revision");
    setStickyOpen(false);
    setActiveTool("none");
    setErasing(false);
    setChangeOpen(true);
    setAskOpen(false);
    setPendingStickyAnchor(null);
    flashSaveNotice(phoneCopy.changeOpened);
  }

  function handlePhoneApprove() {
    const sectionStatuses = {
      ...sessionRef.current.sectionStatuses,
      ...Object.fromEntries(visibleSectionIds.map((id) => [id, "approved" as const])),
    };
    const next = { ...sessionRef.current, sectionStatuses };
    sessionRef.current = next;
    setSession(next);
    setChangeOpen(false);
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void persistToServer(next);
    setConfirmMode("approval");
  }

  function openPhoneRevisionConfirm() {
    const openedAt = phoneChangeOpenedAtRef.current ?? new Date().toISOString();
    const next = buildPhoneRevisionSubmitSession({
      session: sessionRef.current,
      focusedSection,
      draft: stickyDraft,
      changeOpenedAt: openedAt,
      noteId: `sticky-${Date.now()}`,
      createdAt: new Date().toISOString(),
      includeDrawing: phoneDrewThisChangeRef.current,
    });
    sessionRef.current = next;
    setSession(next);
    setPhoneConfirmSummary(summarizePhoneRevisionConfirm(next));
    setStickyDraft(next.stickyNotes[0]?.text ?? "");
    setPendingStickyAnchor(null);
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void persistToServer(next);
    setConfirmMode("revision");
  }

  function handleAskStudio() {
    setAskOpen(true);
    setChangeOpen(false);
    requestAnimationFrame(() => {
      document.getElementById("fs-ask-studio")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handlePhoneErase() {
    setStickyDraft("");
    setPendingStickyAnchor(null);
    setActiveTool("none");
    setStickyOpen(false);
    setErasing(false);
    setDrawResetKey((key) => key + 1);
    phoneDrewThisChangeRef.current = false;
    const next = erasePhoneProofMarks(sessionRef.current, focusedSection);
    sessionRef.current = next;
    setSession(next);
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void persistToServer(next);
  }

  function handleStickySave() {
    if (!stickyDraft.trim()) return;
    const note = {
      id: `sticky-${Date.now()}`,
      sectionId: focusedSection,
      color: stickyColor,
      text: stickyDraft.trim(),
      createdAt: new Date().toISOString(),
      ...(pendingStickyAnchor
        ? { anchorX: pendingStickyAnchor.x, anchorY: pendingStickyAnchor.y }
        : {}),
    };
    debouncedPersist({ ...session, stickyNotes: [...session.stickyNotes, note] });
    setStickyDraft("");
    setPendingStickyAnchor(null);
    setStickyOpen(false);
    setActiveTool("none");
    flashSaveNotice(feedbackStudio.feedbackPanel.saved.sticky);
  }

  async function handleVoiceToggle() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recordStartRef.current = Date.now();
      setRecording(true);
      setRecordingSec(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordingSec(Math.floor((Date.now() - recordStartRef.current) / 1000));
      }, 500);

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
        const durationSec = Math.max(1, Math.floor((Date.now() - recordStartRef.current) / 1000));
        const section = focusedSection;
        setRecording(false);
        setRecordingSec(0);
        setSession((current) => {
          const next = {
            ...current,
            voiceNotes: [
              ...current.voiceNotes,
              {
                id: `voice-${Date.now()}`,
                sectionId: section,
                durationSec,
                createdAt: new Date().toISOString(),
              },
            ],
          };
          void persistToServer(next);
          return next;
        });
        flashSaveNotice(feedbackStudio.feedbackPanel.saved.voice(durationSec));
      };

      recorder.start();
    } catch {
      setRecording(false);
    }
  }

  async function handleRequestRevision() {
    setBusy(true);
    setError(null);
    try {
      const submitting = phoneSurface
        ? buildPhoneRevisionSubmitSession({
            session: sessionRef.current,
            focusedSection,
            draft: stickyDraft,
            changeOpenedAt: phoneChangeOpenedAtRef.current ?? new Date().toISOString(),
            noteId: `sticky-${Date.now()}`,
            createdAt: new Date().toISOString(),
            includeDrawing: phoneDrewThisChangeRef.current,
          })
        : sessionRef.current;
      sessionRef.current = submitting;
      setSession(submitting);
      const feedback = feedbackSessionToJobReviewFeedback(submitting, review);
      const studioExtraChanges = Object.entries(extraDrafts)
        .filter(([, note]) => note.trim().length > 0)
        .map(([id, note]) => ({ id, note }));
      const result = await patchJobReview(review.campaignId, review.jobId, {
        action: "request_revision",
        feedback,
        ...(studioExtraChanges.length > 0 ? { studioExtraChanges } : {}),
      });
      if (studioExtraChanges.length > 0) setExtraDrafts({});
      setExtrasRefreshKey((key) => key + 1);
      if (result.review) {
        onReviewUpdated(result.review);
        setSession(jobReviewFeedbackToFeedbackSession(result.review));
      } else {
        setSession(jobReviewFeedbackToFeedbackSession({
          ...review,
          feedback: result.feedback,
        }));
      }
      setConfirmMode(null);
      setChangeOpen(false);
      setActiveTool("none");
      setPendingStickyAnchor(null);
      setStickyOpen(false);
      setErasing(false);
      flashSaveNotice(feedbackStudio.jobReview.submittedRevision);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Revision request failed";
      const limitReached =
        submitError instanceof Error &&
        "revisionLimitReached" in submitError &&
        Boolean((submitError as Error & { revisionLimitReached?: boolean }).revisionLimitReached);
      setError(limitReached ? feedbackStudio.feedbackPanel.revisionLimitNotice : message);
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveForDelivery() {
    setBusy(true);
    setError(null);
    try {
      const feedback = feedbackSessionToJobReviewFeedback(sessionRef.current, review);
      const result = await patchJobReview(review.campaignId, review.jobId, {
        action: "approve_for_delivery",
        feedback,
      });
      if (result.review) {
        onReviewUpdated(result.review);
        setSession(jobReviewFeedbackToFeedbackSession(result.review));
      } else {
        setSession(jobReviewFeedbackToFeedbackSession({
          ...review,
          feedback: result.feedback,
        }));
      }
      setConfirmMode(null);
      flashSaveNotice(feedbackStudio.jobReview.submittedApproval);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  }

  const submissionReceipt = useMemo(
    () =>
      buildStudioSubmissionReceipt({
        deliverables: review.deliverables,
        activity: review.activity,
        jobId: review.jobId,
      }),
    [review],
  );

  const packageInventory = useMemo(
    () =>
      buildFeedbackPackageInventory(
        feedbackSessionToJobReviewFeedback(session, review),
        review.deliverables,
      ),
    [session, review],
  );

  const approvalScope = useMemo(
    () =>
      summarizeApprovalConfirmScope({
        packageName: review.serviceName,
        visibleSectionIds,
        sectionLabels,
        sectionStatuses: session.sectionStatuses,
      }),
    [review.serviceName, visibleSectionIds, sectionLabels, session.sectionStatuses],
  );

  const lockedPackageReceipt = useMemo(() => {
    if (!review.feedback.submittedAt) return null;
    const senderEvent = [...review.activity]
      .reverse()
      .find(
        (event) =>
          event.kind === "client_revision_request" ||
          event.kind === "client_delivery_approval",
      );
    return buildLockedFeedbackPackageReceipt({
      feedback: review.feedback,
      deliverables: review.deliverables,
      senderLabel: senderEvent?.actor.displayName?.trim() || "Customer",
    });
  }, [review]);

  function toggleLaptopTool(tool: FeedbackTool) {
    setActiveTool((current) => (current === tool ? "none" : tool));
    setStickyOpen(false);
    setErasing(false);
    const deliverable =
      review.deliverables.find((item) => deliverableKeyToSectionId(item.key) === focusedSection) ??
      review.deliverables[0];
    const currentProof = deliverable ? sortProofsByAddedAtDesc(deliverable.proofFiles)[0] : null;
    if (tool === "highlight" && currentProof) setHighlightProofId(currentProof.id);
    if (tool === "textComment" && currentProof) setTextCommentProofId(currentProof.id);
  }

  function saveLaptopMessage() {
    const text = stickyDraft.trim();
    if (!text || submitted) return;
    const deliverable =
      review.deliverables.find((item) => deliverableKeyToSectionId(item.key) === focusedSection) ??
      review.deliverables[0];
    const currentProof = deliverable ? sortProofsByAddedAtDesc(deliverable.proofFiles)[0] : null;
    if (!deliverable || !currentProof) return;
    const now = new Date().toISOString();
    debouncedPersist({
      ...session,
      textComments: [
        ...(session.textComments ?? []),
        {
          id: `message-${Date.now()}`,
          jobId: review.jobId,
          deliverableKey: deliverable.key,
          proofFileId: currentProof.id,
          versionLabel: currentProof.versionLabel,
          text,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });
    setStickyDraft("");
    flashSaveNotice("Message saved");
  }

  const reviewClosed = isJobReviewClosedSpine(review.spineStatus);
  const laptopDesk = feedbackStudio.feedbackPanel.laptopWorkDesk;
  const hasReviewAsset = review.deliverables.some((item) => item.proofFiles.length > 0);
  const deskState = resolveLaptopReviewDeskState({
    hasReviewAsset,
    submitted,
    reviewClosed,
    canRequestRevision: canRequestRevisionNow,
    hasValidReviewInput: hasPhoneRevisionSendContent(session, stickyDraft),
  });

  return (
    <div className="fs-review fs-review--workspace">
      <div className="rd-shell__layout rd-shell__layout--room">
        <div className="rd-shell__side">
          <header className="rd-shell__summary">
            <p className="rd-shell__project">{campaign?.campaignName ?? review.campaignName}</p>
          </header>
          <div className="rd-shell__jobs">
            <p className="rd-shell__jobs-heading">
              {reviewClosed
                ? "Review closed"
                : review.spineStatus === "revision_requested"
                  ? "Revision requested"
                  : feedbackStudio.jobReview.deliverableReady}
            </p>
            <p className="rd-job-list__name">{review.serviceName}</p>
          </div>
        </div>
        <div className={`rd-shell__desk${deskState.toolsUsable ? "" : " rd-shell__desk--empty"}`}>
          <div className="rd-shell__tools" role="toolbar" aria-label="Review tools">
            <button
              type="button"
              className={`rd-shell__tool${deskState.toolsUsable ? "" : " is-muted"}${activeTool === "draw" ? " is-selected" : ""}`}
              aria-pressed={activeTool === "draw"}
              disabled={!deskState.toolsUsable}
              tabIndex={deskState.toolsUsable ? 0 : -1}
              onClick={() => {
                if (!deskState.toolsUsable) return;
                toggleLaptopTool("draw");
              }}
            >
              {laptopDesk.marker}
            </button>
            <button
              type="button"
              className={`rd-shell__tool${deskState.toolsUsable ? "" : " is-muted"}${activeTool === "highlight" ? " is-selected" : ""}`}
              aria-pressed={activeTool === "highlight"}
              disabled={!deskState.toolsUsable}
              tabIndex={deskState.toolsUsable ? 0 : -1}
              onClick={() => {
                if (!deskState.toolsUsable) return;
                toggleLaptopTool("highlight");
              }}
            >
              {laptopDesk.highlighter}
            </button>
            <button
              type="button"
              className={`rd-shell__tool${deskState.toolsUsable ? "" : " is-muted"}${recording ? " is-selected" : ""}`}
              aria-pressed={recording}
              disabled={!deskState.toolsUsable}
              tabIndex={deskState.toolsUsable ? 0 : -1}
              onClick={() => {
                if (!deskState.toolsUsable) return;
                void handleVoiceToggle();
              }}
            >
              {laptopDesk.voice}
            </button>
            <button
              type="button"
              className={`rd-shell__tool${deskState.toolsUsable ? "" : " is-muted"}${activeTool === "textComment" ? " is-selected" : ""}`}
              aria-pressed={activeTool === "textComment"}
              disabled={!deskState.toolsUsable}
              tabIndex={deskState.toolsUsable ? 0 : -1}
              onClick={() => {
                if (!deskState.toolsUsable) return;
                toggleLaptopTool("textComment");
              }}
            >
              {laptopDesk.message}
            </button>
          </div>
          {activeTool === "textComment" && !reviewClosed && !submitted ? (
            <div className="rd-shell__message">
              <label className="rd-shell__message-label" htmlFor="rd-work-message">
                {laptopDesk.message}
              </label>
              <textarea
                id="rd-work-message"
                className="rd-shell__message-input"
                rows={3}
                value={stickyDraft}
                onChange={(event) => setStickyDraft(event.target.value)}
                placeholder={laptopDesk.messagePlaceholder}
              />
              <button
                type="button"
                className="rd-shell__message-save"
                onClick={saveLaptopMessage}
                disabled={!stickyDraft.trim()}
              >
                {laptopDesk.saveMessage}
              </button>
            </div>
          ) : null}
          <h2 id="rd-work-area-heading" className="rd-shell__jobs-heading">
            {laptopDesk.workArea}
          </h2>
          <div className="fs-review__layout">
        <div className="fs-review__main fs-review__stage">
          <JobReviewDeliverablePreview
            reviewTitle={review.campaignName}
            serviceName={review.serviceName}
            jobId={review.jobId}
            spineStatus={review.spineStatus}
            deliverables={review.deliverables}
            focusedSection={focusedSection}
            visibleSectionIds={visibleSectionIds}
            sectionLabels={sectionLabels}
            activeTool={activeTool}
            erasing={erasing}
            session={session}
            compareCurrentId={compareCurrentId}
            comparePriorId={comparePriorId}
            highlightProofId={highlightProofId}
            textCommentProofId={textCommentProofId}
            onFocusSection={(sectionId) => {
              setFocusedSection(sectionId);
              setCompareCurrentId(null);
              setComparePriorId(null);
              setHighlightProofId(null);
              setTextCommentProofId(null);
            }}
            onDrawStroke={() => markDraw(focusedSection)}
            onCompareSelectCurrent={setCompareCurrentId}
            onCompareSelectPrior={setComparePriorId}
            onHighlightSelectProof={setHighlightProofId}
            onHighlightsChange={(next) => {
              debouncedPersist({ ...session, highlights: [...next] });
            }}
            onTextCommentSelectProof={setTextCommentProofId}
            onTextCommentsChange={(next) => {
              debouncedPersist({ ...session, textComments: [...next] });
            }}
            onCompareToggle={() => {
              setActiveTool((tool) => (tool === "compare" ? "none" : "compare"));
              setStickyOpen(false);
              setErasing(false);
            }}
            stickyPlaceActive={false}
            pendingStickyAnchor={null}
            stickyDraft={stickyDraft}
            drawResetKey={drawResetKey}
          />

          <div className="rd-shell__submit-row">
            <button
              type="button"
              className={`rd-shell__submit${deskState.submitActive ? "" : " is-muted"}`}
              disabled={!deskState.submitActive || busy}
              tabIndex={deskState.submitActive ? 0 : -1}
              onClick={() => {
                if (!deskState.submitActive || busy) return;
                if (saveTimerRef.current) {
                  window.clearTimeout(saveTimerRef.current);
                  saveTimerRef.current = null;
                  void persistToServer(sessionRef.current);
                }
                setConfirmMode("revision");
              }}
            >
              {laptopDesk.submit}
            </button>
            <button
              type="button"
              className="utility-btn utility-btn--primary fs-review__action fs-review__action--approve"
              disabled={busy || !deskState.approveActive}
              onClick={() => {
                if (busy || !deskState.approveActive) return;
                handlePhoneApprove();
              }}
            >
              {feedbackStudio.feedbackPanel.approveForDelivery}
            </button>
          </div>

          <JobReviewPhoneCustomerDock
            submitted={submitted}
            busy={busy}
            canSendRevision={phoneCanSend}
            canOfferChange={canOfferChange}
            revisionWorking={revisionWorking}
            changeOpen={changeOpen}
            askOpen={askOpen}
            stickyDraft={stickyDraft}
            activeTool={activeTool}
            recording={recording}
            recordingSec={recordingSec}
            hasDrawnMarks={session.drawSections.includes(focusedSection)}
            onApprove={handlePhoneApprove}
            onRequestChange={handlePhoneRequestChange}
            onAskStudio={handleAskStudio}
            onStickyDraft={setStickyDraft}
            onSendRevision={openPhoneRevisionConfirm}
            onDrawToggle={() => {
              setActiveTool((tool) => (tool === "draw" ? "none" : "draw"));
              setErasing(false);
              setPendingStickyAnchor(null);
            }}
            onVoiceToggle={() => void handleVoiceToggle()}
            onErase={handlePhoneErase}
          />

          <div className="fs-review__choose fs-review__choose--job">
            <button
              type="button"
              className="utility-btn fs-review__action fs-review__action--revision"
              disabled={busy || submitted || !canRequestRevisionNow}
              onClick={() => {
                if (saveTimerRef.current) {
                  window.clearTimeout(saveTimerRef.current);
                  saveTimerRef.current = null;
                  void persistToServer(sessionRef.current);
                }
                setConfirmMode("revision");
              }}
            >
              {feedbackStudio.feedbackPanel.requestRevisionJob}
            </button>
            <button
              type="button"
              className="utility-btn utility-btn--primary fs-review__action fs-review__action--approve"
              disabled={busy || submitted || !canApproveNow}
              onClick={() => {
                if (saveTimerRef.current) {
                  window.clearTimeout(saveTimerRef.current);
                  saveTimerRef.current = null;
                  void persistToServer(sessionRef.current);
                }
                setConfirmMode("approval");
              }}
            >
              {feedbackStudio.feedbackPanel.approveForDelivery}
            </button>
            <Link href={studioBoard.routes.studioBoard} className="fs-review__board-link">
              {feedbackStudio.backLabel} →
            </Link>
          </div>

          {error ? (
            <p className="fs-review__error" role="alert">
              {error}
            </p>
          ) : null}

          <StudioExtrasPanel
            campaignId={review.campaignId}
            placement="review"
            drafts={extraDrafts}
            onDraftsChange={setExtraDrafts}
            refreshKey={extrasRefreshKey}
            bare
          />

          {confirmMode ? (
            <FeedbackStudioSubmitConfirm
              mode={confirmMode}
              inventory={packageInventory}
              versionLabel={packageInventory.versionLabel}
              busy={busy}
              surface={phoneSurface ? "phone" : "desktop"}
              phoneSummary={phoneConfirmSummary}
              approvalScope={approvalScope}
              onCancel={() => setConfirmMode(null)}
              onConfirm={() => {
                if (confirmMode === "revision") {
                  void handleRequestRevision();
                } else {
                  void handleApproveForDelivery();
                }
              }}
            />
          ) : null}
        </div>

        <aside className="fs-review__rail" aria-label="Review status, tools, and project communication">
          <p className="fs-review__phone-glance" role="status">
            {phoneCopy.revisionGlance(
              accounting.included,
              accounting.remaining,
            )}
          </p>

          <div
            id="fs-ask-studio"
            className={`fs-review__ask${askOpen ? " fs-review__ask--open" : ""}`}
          >
            <StudioBoardProjectCommunicationSection
              campaign={campaign}
              hasCampaign={Boolean(campaign)}
              campaignLookupPending={false}
              jobId={review.jobId}
              presentation={{
                sectionTitle: PROJECT_COMMUNICATION_CUSTOMER_V1.reviewRoomSectionTitle,
                sectionLead: PROJECT_COMMUNICATION_CUSTOMER_V1.reviewRoomSectionLead,
                titleId: "fs-project-communication-title",
                rootClassName:
                  "fs-project-communication bf-material bf-material-paper",
                autoFocusComposer: askOpen,
              }}
            />
          </div>

          <details className="fs-review__phone-fold">
            <summary className="fs-review__phone-fold-summary">{phoneCopy.projectDetails}</summary>
            <p className="fs-review__phone-fold-body">{feedbackStudio.jobReview.pickerLead}</p>
            {review.deliverables.map((deliverable) => (
              <p key={deliverable.key} className="fs-review__phone-fold-body">
                {deliverable.label}
              </p>
            ))}
          </details>

          <details className="fs-review__phone-fold fs-review__phone-fold--history">
            <summary className="fs-review__phone-fold-summary">{phoneCopy.projectHistory}</summary>
            <div className="fs-review__desktop-audit">
              <FeedbackStudioHandoffStatus review={review} />
              <FeedbackStudioUpdateHistory items={review.updateHistory ?? []} />
              {submissionReceipt && !submitted ? (
                <FeedbackStudioSubmissionReceipt receipt={submissionReceipt} />
              ) : null}
              {submitted && lockedPackageReceipt ? (
                <FeedbackStudioLockedPackageReceipt receipt={lockedPackageReceipt} />
              ) : null}
              <FeedbackStudioCorrectionAccounting
                accounting={review.correctionAccounting}
                exhaustedWording={review.exhaustedWording}
              />
              <FeedbackStudioRevisionStatus status={revisionStatus} />
            </div>
          </details>

          <div className="fs-review__desktop-rail">
            <FeedbackStudioHandoffStatus review={review} />
            <FeedbackStudioUpdateHistory items={review.updateHistory ?? []} />
            {submissionReceipt && !submitted ? (
              <FeedbackStudioSubmissionReceipt receipt={submissionReceipt} />
            ) : null}
            {submitted && lockedPackageReceipt ? (
              <FeedbackStudioLockedPackageReceipt receipt={lockedPackageReceipt} />
            ) : null}
            <FeedbackStudioCorrectionAccounting
              accounting={review.correctionAccounting}
              exhaustedWording={review.exhaustedWording}
            />
            <FeedbackStudioRevisionStatus status={revisionStatus} />
          </div>

          <FeedbackStudioFeedbackPanel
            mode="job"
            focusedSection={focusedSection}
            focusedSectionLabel={focusedSectionLabel}
            visibleSectionIds={visibleSectionIds}
            sectionLabels={sectionLabels}
            activeTool={activeTool}
            stickyColor={stickyColor}
            stickyDraft={stickyDraft}
            stickyOpen={stickyOpen}
            composerKind={composerKind}
            erasing={erasing}
            recording={recording}
            recordingSec={recordingSec}
            session={session}
            submitted={submitted}
            saveNotice={saveNotice}
            canSendRevision={phoneCanSend}
            onStickyOpen={() => {
              setComposerKind("sticky");
              setStickyColor("coral");
              setStickyOpen((open) => !open);
              setActiveTool("sticky");
            }}
            onStickyColor={setStickyColor}
            onStickyDraft={setStickyDraft}
            onStickySave={handleStickySave}
            onStickyCancel={() => {
              setStickyOpen(false);
              setStickyDraft("");
              setComposerKind("none");
              setActiveTool("none");
            }}
            onDrawToggle={() => {
              setActiveTool((tool) => (tool === "draw" ? "none" : "draw"));
              setErasing(false);
              setStickyOpen(false);
            }}
            onDrawPencil={() => setErasing(false)}
            onDrawErase={() => setErasing(true)}
            onDrawDone={() => {
              if (session.drawSections.includes(focusedSection)) {
                flashSaveNotice(feedbackStudio.feedbackPanel.saved.draw);
              }
              setActiveTool("none");
              setErasing(false);
            }}
            onCompareToggle={() => {
              setActiveTool((tool) => (tool === "compare" ? "none" : "compare"));
              setStickyOpen(false);
              setErasing(false);
            }}
            onCompareDone={() => setActiveTool("none")}
            onHighlightToggle={() => {
              setActiveTool((tool) => (tool === "highlight" ? "none" : "highlight"));
              setStickyOpen(false);
              setErasing(false);
            }}
            onHighlightDone={() => setActiveTool("none")}
            onTextCommentToggle={() => {
              setActiveTool((tool) => (tool === "textComment" ? "none" : "textComment"));
              setStickyOpen(false);
              setErasing(false);
            }}
            onTextCommentDone={() => setActiveTool("none")}
            onVoiceToggle={() => void handleVoiceToggle()}
            onApprove={handleApprove}
            onRevision={handleRevision}
            onRequestChange={handlePhoneRequestChange}
            onSendRevision={openPhoneRevisionConfirm}
            onSkip={handleSkip}
            onSubmit={() => undefined}
          />
        </aside>
      </div>
        </div>
      </div>
    </div>
  );
}
