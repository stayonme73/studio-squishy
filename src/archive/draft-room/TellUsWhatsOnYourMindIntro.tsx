/**
 * @archived Standalone "Tell us what's on your mind" intake opening.
 * Opening copy now lives in Project Discovery; post-payment intake may still render this step.
 * @see docs/customer-journey-v1-locked.md
 */

import type { draftRoom } from "@/config/draft-room";

type Introduction = (typeof draftRoom)["intakeForm"]["introduction"];

type Props = {
  introduction: Introduction;
};

export default function TellUsWhatsOnYourMindIntro({ introduction }: Props) {
  return (
    <div className="dri-step-content dri-step-content--intro">
      <p className="dri-eyebrow">{introduction.eyebrow}</p>
      <h2 className="dri-title">{introduction.title}</h2>
      <div className="dri-intro-leads" aria-hidden>
        {introduction.leads.map((line) => (
          <p key={line} className="dri-intro-lead">
            {line}
          </p>
        ))}
      </div>
      {introduction.paragraphs.map((paragraph) => (
        <p key={paragraph} className="dri-body">
          {paragraph}
        </p>
      ))}
      <div className="dri-intro-starters" aria-hidden>
        <p className="dri-intro-starters-label">
          <svg className="dri-intro-spark" viewBox="0 0 16 16" aria-hidden>
            <path
              d="M8 2.5v11M4.5 8h7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          {introduction.ideaStartersLabel}
        </p>
        <div className="dri-intro-starter-cards">
          {introduction.ideaStarters.map((idea) => (
            <span key={idea} className="dri-intro-starter">
              {idea}
            </span>
          ))}
        </div>
      </div>
      <p className="dri-intro-closing">{introduction.closingNote}</p>
    </div>
  );
}
