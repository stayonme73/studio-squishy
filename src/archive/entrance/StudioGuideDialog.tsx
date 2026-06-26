"use client";

import { welcomeHallInteraction } from "@/config/welcome-hall-interaction";

type Props = {
  open: boolean;
  onClose: () => void;
  onDraftIdea: () => void;
  onPlanProject: () => void;
  /** V3: category pre-selected from showroom wall */
  selectedCategoryLabel?: string;
  /** V3: early kiosk tap — guide visitor to explore first */
  redirectMessage?: string;
};

export default function StudioGuideDialog({
  open,
  onClose,
  onDraftIdea,
  onPlanProject,
  selectedCategoryLabel,
  redirectMessage,
}: Props) {
  const { studioGuide } = welcomeHallInteraction;

  if (!open) return null;

  const isRedirect = Boolean(redirectMessage);

  return (
    <div className="hall-guide-backdrop" role="presentation" onClick={onClose}>
      <dialog
        className="hall-guide-dialog"
        open
        aria-labelledby="hall-guide-title"
        aria-describedby="hall-guide-prompt"
        onClick={(e) => e.stopPropagation()}
      >
        {isRedirect ? (
          <>
            <p id="hall-guide-title" className="hall-guide-welcome">
              {studioGuide.welcome}
            </p>
            <p id="hall-guide-prompt" className="hall-guide-prompt hall-guide-redirect">
              {redirectMessage}
            </p>
            <button type="button" className="hall-guide-close" onClick={onClose}>
              Got it
            </button>
          </>
        ) : (
          <>
            <p id="hall-guide-title" className="hall-guide-welcome">
              {studioGuide.welcome}
            </p>
            {selectedCategoryLabel && (
              <p className="hall-guide-category">Interest: {selectedCategoryLabel}</p>
            )}
            <p id="hall-guide-prompt" className="hall-guide-prompt">
              {studioGuide.prompt}
            </p>

            <ul className="hall-guide-options">
              <li>
                <button type="button" className="hall-guide-option" onClick={onDraftIdea}>
                  <span className="hall-guide-option-icon" aria-hidden>
                    ✏️
                  </span>
                  <span className="hall-guide-option-text">
                    <span className="hall-guide-option-label">{studioGuide.options.draftIdea.label}</span>
                    <span className="hall-guide-option-desc">{studioGuide.options.draftIdea.description}</span>
                  </span>
                </button>
              </li>
              <li>
                <button type="button" className="hall-guide-option" onClick={onPlanProject}>
                  <span className="hall-guide-option-icon" aria-hidden>
                    📋
                  </span>
                  <span className="hall-guide-option-text">
                    <span className="hall-guide-option-label">{studioGuide.options.planProject.label}</span>
                    <span className="hall-guide-option-desc">{studioGuide.options.planProject.description}</span>
                  </span>
                </button>
              </li>
              <li>
                <button type="button" className="hall-guide-option hall-guide-option--disabled" disabled>
                  <span className="hall-guide-option-icon" aria-hidden>
                    🔍
                  </span>
                  <span className="hall-guide-option-text">
                    <span className="hall-guide-option-label">{studioGuide.options.explore.label}</span>
                    <span className="hall-guide-option-desc">{studioGuide.options.explore.description}</span>
                  </span>
                </button>
              </li>
            </ul>

            <button type="button" className="hall-guide-close" onClick={onClose}>
              Close
            </button>
          </>
        )}
      </dialog>
    </div>
  );
}
