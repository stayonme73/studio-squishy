"use client";

import type {
  FeedbackConceptPreview,
  FeedbackSectionId,
  FeedbackSession,
  FeedbackStickyNote,
  FeedbackTool,
  SectionReviewStatus,
} from "@/config/feedback-studio";
import { feedbackStudio } from "@/config/feedback-studio";

import FeedbackStudioDrawLayer from "./FeedbackStudioDrawLayer";

type Props = {
  concept: FeedbackConceptPreview;
  campaignTitle: string;
  focusedSection: FeedbackSectionId;
  activeTool: FeedbackTool;
  erasing: boolean;
  session: FeedbackSession;
  onFocusSection: (sectionId: FeedbackSectionId) => void;
  onDrawStroke: (sectionId: FeedbackSectionId) => void;
};

export default function FeedbackStudioConceptPreview({
  concept,
  campaignTitle,
  focusedSection,
  activeTool,
  erasing,
  session,
  onFocusSection,
  onDrawStroke,
}: Props) {
  const { previewSections: labels } = feedbackStudio;

  return (
    <div className="fs-preview fs-preview--workspace">
      <header className="fs-preview__header">
        <p className="fs-preview__eyebrow">
          {feedbackStudio.reviewConceptLabel(concept.id)} · {concept.tagline}
        </p>
        <h2 className="fs-preview__title">{campaignTitle}</h2>
        <p className="fs-preview__summary">{concept.summary}</p>
      </header>

      <PreviewSection
        sectionId="hero"
        label={labels.hero}
        focused={focusedSection === "hero"}
        status={session.sectionStatuses.hero}
        large
        onFocus={() => onFocusSection("hero")}
        drawActive={activeTool === "draw" && focusedSection === "hero"}
        erasing={erasing}
        onDrawStroke={() => onDrawStroke("hero")}
        stickies={session.stickyNotes.filter((n) => n.sectionId === "hero")}
      >
        <div className={`fs-mock fs-mock--hero fs-mock--${concept.hero.accent} fs-mock--large`}>
          <p className="fs-mock__headline">{concept.hero.headline}</p>
          <p className="fs-mock__subhead">{concept.hero.subhead}</p>
          <div className="fs-mock__hero-art" aria-hidden />
        </div>
      </PreviewSection>

      <PreviewSection
        sectionId="social"
        label={labels.social}
        focused={focusedSection === "social"}
        status={session.sectionStatuses.social}
        onFocus={() => onFocusSection("social")}
        drawActive={activeTool === "draw" && focusedSection === "social"}
        erasing={erasing}
        onDrawStroke={() => onDrawStroke("social")}
        stickies={session.stickyNotes.filter((n) => n.sectionId === "social")}
      >
        <article className="fs-mock fs-mock--social">
          <p className="fs-mock__channel">{concept.social.platform}</p>
          <p className="fs-mock__body">{concept.social.body}</p>
          <p className="fs-mock__cta">{concept.social.cta}</p>
        </article>
      </PreviewSection>

      <PreviewSection
        sectionId="email"
        label={labels.email}
        focused={focusedSection === "email"}
        status={session.sectionStatuses.email}
        onFocus={() => onFocusSection("email")}
        drawActive={activeTool === "draw" && focusedSection === "email"}
        erasing={erasing}
        onDrawStroke={() => onDrawStroke("email")}
        stickies={session.stickyNotes.filter((n) => n.sectionId === "email")}
      >
        <article className="fs-mock fs-mock--email">
          <p className="fs-mock__email-subject">{concept.email.subject}</p>
          <p className="fs-mock__email-pre">{concept.email.preheader}</p>
          <p className="fs-mock__body">{concept.email.body}</p>
        </article>
      </PreviewSection>

      <PreviewSection
        sectionId="sms"
        label={labels.sms}
        focused={focusedSection === "sms"}
        status={session.sectionStatuses.sms}
        onFocus={() => onFocusSection("sms")}
        drawActive={activeTool === "draw" && focusedSection === "sms"}
        erasing={erasing}
        onDrawStroke={() => onDrawStroke("sms")}
        stickies={session.stickyNotes.filter((n) => n.sectionId === "sms")}
      >
        <article className="fs-mock fs-mock--sms">
          <p className="fs-mock__sms-bubble">{concept.sms.body}</p>
        </article>
      </PreviewSection>

      <PreviewSection
        sectionId="rationale"
        label={labels.rationale}
        focused={focusedSection === "rationale"}
        status={session.sectionStatuses.rationale}
        onFocus={() => onFocusSection("rationale")}
        drawActive={activeTool === "draw" && focusedSection === "rationale"}
        erasing={erasing}
        onDrawStroke={() => onDrawStroke("rationale")}
        stickies={session.stickyNotes.filter((n) => n.sectionId === "rationale")}
        rationale
      >
        <p className="fs-preview__rationale">{concept.whyChosen}</p>
      </PreviewSection>
    </div>
  );
}

function PreviewSection({
  sectionId,
  label,
  focused,
  status,
  large,
  rationale,
  drawActive,
  erasing,
  stickies,
  onFocus,
  onDrawStroke,
  children,
}: {
  sectionId: FeedbackSectionId;
  label: string;
  focused: boolean;
  status: SectionReviewStatus;
  large?: boolean;
  rationale?: boolean;
  drawActive: boolean;
  erasing: boolean;
  stickies: FeedbackStickyNote[];
  onFocus: () => void;
  onDrawStroke: () => void;
  children: React.ReactNode;
}) {
  const { sectionStatus } = feedbackStudio;

  return (
    <section
      className={`fs-preview__section fs-preview__section--selectable${
        focused ? " fs-preview__section--focused" : ""
      }${large ? " fs-preview__section--large" : ""}${rationale ? " fs-preview__section--rationale" : ""}${
        status !== "neutral" ? ` fs-preview__section--${status}` : ""
      }`}
      aria-labelledby={`fs-${sectionId}-label`}
    >
      <button type="button" className="fs-preview__section-head" onClick={onFocus}>
        <h3 id={`fs-${sectionId}-label`} className="fs-preview__section-label">
          {label}
        </h3>
        <span className={`fs-preview__section-status fs-preview__section-status--${status}`}>
          {sectionStatus[status]}
        </span>
      </button>

      <div className="fs-preview__section-body">
        {children}
        {stickies.length > 0 ? (
          <ul className="fs-sticky-list" aria-label={`Notes on ${label}`}>
            {stickies.map((note) => (
              <li key={note.id} className={`fs-sticky fs-sticky--${note.color}`}>
                {note.text}
              </li>
            ))}
          </ul>
        ) : null}
        <FeedbackStudioDrawLayer active={drawActive} erasing={erasing} onStroke={onDrawStroke} />
      </div>
    </section>
  );
}
