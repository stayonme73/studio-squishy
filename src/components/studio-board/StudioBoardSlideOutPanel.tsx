"use client";

import { useEffect, useId, type ReactNode } from "react";

type StudioBoardSlideOutPanelProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

export default function StudioBoardSlideOutPanel({
  title,
  eyebrow = "Studio Board",
  children,
  footer,
  onClose,
}: StudioBoardSlideOutPanelProps) {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="sb-board-slideout" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className="sb-board-slideout__backdrop"
        aria-label="Close panel"
        onClick={onClose}
      />
      <section className="sb-board-slideout__panel">
        <header className="sb-board-slideout__header">
          <div className="sb-board-slideout__heading">
            <p className="sb-board-slideout__eyebrow">{eyebrow}</p>
            <h2 id={titleId} className="sb-board-slideout__title">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="sb-board-slideout__close"
            aria-label="Close panel"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="sb-board-slideout__body">{children}</div>
        <footer className="sb-board-slideout__footer">
          <button type="button" className="sb-board-slideout__back-link" onClick={onClose}>
            Back to Studio Board
          </button>
          {footer}
        </footer>
      </section>
    </div>
  );
}
