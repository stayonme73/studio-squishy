"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import FeedbackStudioConceptPreview from "@/components/feedback-studio/FeedbackStudioConceptPreview";
import FeedbackStudioFeedbackPanel from "@/components/feedback-studio/FeedbackStudioFeedbackPanel";
import FeedbackStudioRevisionStatus from "@/components/feedback-studio/FeedbackStudioRevisionStatus";
import { conceptOptionTitle } from "@/components/feedback-studio/FeedbackStudioConceptPicker";
import type {
  FeedbackConceptPreview,
  FeedbackSectionId,
  FeedbackSession,
  FeedbackTool,
  StickyNoteColorId,
} from "@/config/feedback-studio";
import { feedbackStudio } from "@/config/feedback-studio";
import { studioBoard } from "@/config/studio-board";
import {
  loadFeedbackSession,
  saveFeedbackSession,
  submitFeedbackSession,
} from "@/lib/feedback-studio-session";
import { completeCampaignReviewIfReady } from "@/lib/studio-board-campaign";

type Props = {
  concept: FeedbackConceptPreview;
  campaignTitle: string;
  campaignId: string;
  pickerHref: string;
  revisionStatus: string;
  selectedOptionTitle: string | null;
  onSelect: () => void;
};

/** Interactive review workspace — preview + feedback tools. */
export default function FeedbackStudioReviewWorkspace({
  concept,
  campaignTitle,
  campaignId,
  pickerHref,
  revisionStatus,
  selectedOptionTitle,
  onSelect,
}: Props) {
  const [session, setSession] = useState<FeedbackSession | null>(null);
  const [focusedSection, setFocusedSection] = useState<FeedbackSectionId>("hero");
  const [activeTool, setActiveTool] = useState<FeedbackTool>("none");
  const [stickyOpen, setStickyOpen] = useState(false);
  const [stickyColor, setStickyColor] = useState<StickyNoteColorId>("yellow");
  const [stickyDraft, setStickyDraft] = useState("");
  const [erasing, setErasing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStartRef = useRef<number>(0);
  const recordTimerRef = useRef<number | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSession(loadFeedbackSession(campaignId, concept.id));
  }, [campaignId, concept.id]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const flashSaveNotice = useCallback((message: string) => {
    setSaveNotice(message);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setSaveNotice(null), 3200);
  }, []);

  const persist = useCallback(
    (next: FeedbackSession) => {
      setSession(next);
      saveFeedbackSession(next);
    },
    [],
  );

  const focusedSectionLabel = feedbackStudio.previewSections[focusedSection];
  const submitted = Boolean(session?.submittedAt);
  const optionTitle = conceptOptionTitle(concept);
  const isSelected = selectedOptionTitle === optionTitle;

  function markDraw(sectionId: FeedbackSectionId) {
    if (!session) return;
    if (session.drawSections.includes(sectionId)) return;
    persist({ ...session, drawSections: [...session.drawSections, sectionId] });
  }

  function handleApprove() {
    if (!session) return;
    persist({
      ...session,
      sectionStatuses: { ...session.sectionStatuses, [focusedSection]: "approved" },
    });
    flashSaveNotice(feedbackStudio.feedbackPanel.saved.approve(focusedSectionLabel));
  }

  function handleRevision() {
    if (!session) return;
    persist({
      ...session,
      sectionStatuses: { ...session.sectionStatuses, [focusedSection]: "revision" },
    });
    flashSaveNotice(feedbackStudio.feedbackPanel.saved.revision(focusedSectionLabel));
  }

  function handleStickySave() {
    if (!session || !stickyDraft.trim()) return;
    const note = {
      id: `sticky-${Date.now()}`,
      sectionId: focusedSection,
      color: stickyColor,
      text: stickyDraft.trim(),
      createdAt: new Date().toISOString(),
    };
    persist({ ...session, stickyNotes: [...session.stickyNotes, note] });
    setStickyDraft("");
    setStickyOpen(false);
    setActiveTool("none");
    flashSaveNotice(feedbackStudio.feedbackPanel.saved.sticky);
  }

  async function handleVoiceToggle() {
    if (!session) return;

    if (recording) {
      recorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const fallbackSec = 3;
      persist({
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
          if (!current) return current;
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
          saveFeedbackSession(next);
          return next;
        });
        flashSaveNotice(feedbackStudio.feedbackPanel.saved.voice(durationSec));
      };

      recorder.start();
    } catch {
      setRecording(false);
    }
  }

  function handleSubmit() {
    if (!session) return;
    const next = submitFeedbackSession(session);
    setSession(next);
    completeCampaignReviewIfReady();
  }

  if (!session) {
    return <div className="fs-review fs-review--loading" aria-busy="true" />;
  }

  return (
    <div className="fs-review fs-review--workspace">
      <div className="fs-review__nav">
        <Link href={pickerHref} className="utility-btn utility-btn--secondary fs-review__back">
          ← {feedbackStudio.reviewBackLabel}
        </Link>
      </div>

      <div className="fs-review__layout">
        <div className="fs-review__main">
          <FeedbackStudioConceptPreview
            concept={concept}
            campaignTitle={campaignTitle}
            focusedSection={focusedSection}
            activeTool={activeTool}
            erasing={erasing}
            session={session}
            onFocusSection={setFocusedSection}
            onDrawStroke={() => markDraw(focusedSection)}
          />

          <div className="fs-review__choose">
            {isSelected ? (
              <p className="fs-review__selected">{feedbackStudio.selectedBadge}</p>
            ) : (
              <button type="button" className="utility-btn utility-btn--primary" onClick={onSelect}>
                {feedbackStudio.selectDirectionCta}
              </button>
            )}
            <Link href={studioBoard.routes.studioBoard} className="fs-review__board-link">
              {feedbackStudio.backLabel} →
            </Link>
          </div>
        </div>

        <aside className="fs-review__rail" aria-label="Review status and feedback">
          <FeedbackStudioRevisionStatus status={revisionStatus} />

          <FeedbackStudioFeedbackPanel
            focusedSection={focusedSection}
            focusedSectionLabel={focusedSectionLabel}
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
            onVoiceToggle={handleVoiceToggle}
            onApprove={handleApprove}
            onRevision={handleRevision}
            onSubmit={handleSubmit}
          />
        </aside>
      </div>
    </div>
  );
}
