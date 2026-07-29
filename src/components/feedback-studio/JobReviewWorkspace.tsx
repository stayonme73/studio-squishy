"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import FeedbackStudioFeedbackPanel from "@/components/feedback-studio/FeedbackStudioFeedbackPanel";
import FeedbackStudioHandoffStatus from "@/components/feedback-studio/FeedbackStudioHandoffStatus";
import FeedbackStudioRevisionStatus from "@/components/feedback-studio/FeedbackStudioRevisionStatus";
import JobReviewDeliverablePreview from "@/components/feedback-studio/JobReviewDeliverablePreview";
import StudioBoardProjectCommunicationSection from "@/components/studio-board/StudioBoardProjectCommunicationSection";
import type {
  FeedbackSectionId,
  FeedbackSession,
  FeedbackTool,
  StickyNoteColorId,
} from "@/config/feedback-studio";
import { feedbackStudio, resolveFeedbackSectionLabel } from "@/config/feedback-studio";
import { PROJECT_COMMUNICATION_CUSTOMER_V1 } from "@/config/project-communication-customer-v1";
import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import type { ClientReviewView } from "@/lib/job-control/review-room-view";
import {
  deliverableKeyToSectionId,
  feedbackSessionToJobReviewFeedback,
  jobReviewFeedbackToFeedbackSession,
  patchJobReview,
} from "@/lib/review-room-client";

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
  const [stickyOpen, setStickyOpen] = useState(false);
  const [stickyColor, setStickyColor] = useState<StickyNoteColorId>("yellow");
  const [stickyDraft, setStickyDraft] = useState("");
  const [erasing, setErasing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStartRef = useRef<number>(0);
  const recordTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSession(jobReviewFeedbackToFeedbackSession(review));
    setFocusedSection(visibleSectionIds[0] ?? "fallback:deliverable-0");
  }, [review, visibleSectionIds]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

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
  const revisionStatus =
    review.revisionRoundsUsed >= review.revisionRoundsIncluded
      ? feedbackStudio.reviewStatus.finalRound
      : feedbackStudio.reviewStatus.roundOf(
          review.revisionRoundsUsed + 1,
          review.revisionRoundsIncluded,
        );

  function markDraw(sectionId: FeedbackSectionId) {
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

  function handleStickySave() {
    if (!stickyDraft.trim()) return;
    const note = {
      id: `sticky-${Date.now()}`,
      sectionId: focusedSection,
      color: stickyColor,
      text: stickyDraft.trim(),
      createdAt: new Date().toISOString(),
    };
    debouncedPersist({ ...session, stickyNotes: [...session.stickyNotes, note] });
    setStickyDraft("");
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
      const fallbackSec = 3;
      debouncedPersist({
        ...session,
        voiceNotes: [
          ...session.voiceNotes,
          {
            id: `voice-${Date.now()}`,
            sectionId: focusedSection,
            durationSec: fallbackSec,
            createdAt: new Date().toISOString(),
          },
        ],
      });
      flashSaveNotice(feedbackStudio.feedbackPanel.saved.voice(fallbackSec));
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
      const feedback = feedbackSessionToJobReviewFeedback(session, review);
      const result = await patchJobReview(review.campaignId, review.jobId, {
        action: "request_revision",
        feedback,
      });
      if (result.review) {
        onReviewUpdated(result.review);
        setSession(jobReviewFeedbackToFeedbackSession(result.review));
      }
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
      const feedback = feedbackSessionToJobReviewFeedback(session, review);
      const result = await patchJobReview(review.campaignId, review.jobId, {
        action: "approve_for_delivery",
        feedback,
      });
      if (result.review) {
        onReviewUpdated(result.review);
        setSession(jobReviewFeedbackToFeedbackSession(result.review));
      }
      flashSaveNotice(feedbackStudio.jobReview.submittedApproval);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fs-review fs-review--workspace">
      <div className="fs-review__layout">
        <div className="fs-review__main">
          <JobReviewDeliverablePreview
            reviewTitle={review.campaignName}
            serviceName={review.serviceName}
            deliverables={review.deliverables}
            focusedSection={focusedSection}
            visibleSectionIds={visibleSectionIds}
            sectionLabels={sectionLabels}
            activeTool={activeTool}
            erasing={erasing}
            session={session}
            onFocusSection={setFocusedSection}
            onDrawStroke={() => markDraw(focusedSection)}
          />

          <div className="fs-review__choose fs-review__choose--job">
            <button
              type="button"
              className="utility-btn utility-btn--secondary"
              disabled={busy || submitted || !review.canRequestRevision}
              onClick={() => void handleRequestRevision()}
            >
              {feedbackStudio.feedbackPanel.requestRevisionJob}
            </button>
            <button
              type="button"
              className="utility-btn utility-btn--primary"
              disabled={busy || submitted || !review.canApproveForDelivery}
              onClick={() => void handleApproveForDelivery()}
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
        </div>

        <aside className="fs-review__rail" aria-label="Review status, tools, and project communication">
          <FeedbackStudioHandoffStatus review={review} />
          <FeedbackStudioRevisionStatus status={revisionStatus} />

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
            erasing={erasing}
            recording={recording}
            recordingSec={recordingSec}
            session={session}
            submitted={submitted}
            saveNotice={saveNotice}
            onStickyOpen={() => {
              setStickyOpen((open) => !open);
              setActiveTool("sticky");
            }}
            onStickyColor={setStickyColor}
            onStickyDraft={setStickyDraft}
            onStickySave={handleStickySave}
            onStickyCancel={() => {
              setStickyOpen(false);
              setStickyDraft("");
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
            onVoiceToggle={() => void handleVoiceToggle()}
            onApprove={handleApprove}
            onRevision={handleRevision}
            onSkip={handleSkip}
            onSubmit={() => undefined}
          />

          <StudioBoardProjectCommunicationSection
            campaign={campaign}
            hasCampaign={Boolean(campaign)}
            campaignLookupPending={false}
            presentation={{
              sectionTitle: PROJECT_COMMUNICATION_CUSTOMER_V1.reviewRoomSectionTitle,
              sectionLead: PROJECT_COMMUNICATION_CUSTOMER_V1.reviewRoomSectionLead,
              titleId: "fs-project-communication-title",
              rootClassName:
                "fs-project-communication bf-material bf-material-paper",
            }}
          />
        </aside>
      </div>
    </div>
  );
}
