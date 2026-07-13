"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

import ProjectBuilderJobDetailBlocks from "@/components/project-builder/ProjectBuilderJobDetailBlocks";
import { PROJECT_BUILDER_V1 } from "@/config/project-builder-v1";
import type { RouteMapJob, RouteMapRoadId } from "@/config/route-map-v1";
import { resolveProjectBuilderDrawerTagline } from "@/lib/project-builder-drawer-tagline";
import { resolveProjectBuilderJobPresentation } from "@/lib/project-builder-update-exit-copy";

type Props = {
  job: RouteMapJob;
  roadId: RouteMapRoadId;
  selected: boolean;
  addDisabled?: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onAdd: () => void;
  onRemove: () => void;
};

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null || element === document.activeElement);
}

/** Learn More — viewport modal with one scroll surface and locked page scroll. */
export default function ProjectBuilderServiceDrawer({
  job,
  roadId,
  selected,
  addDisabled = false,
  returnFocusRef,
  onClose,
  onAdd,
  onRemove,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const presentation = resolveProjectBuilderJobPresentation(job, roadId);
  const tagline = presentation.tagline || resolveProjectBuilderDrawerTagline(job);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = getFocusableElements(panelRef.current);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    const scrollY = window.scrollY;
    const { style: bodyStyle } = document.body;
    const { style: htmlStyle } = document.documentElement;
    const previousBodyOverflow = bodyStyle.overflow;
    const previousBodyPosition = bodyStyle.position;
    const previousBodyTop = bodyStyle.top;
    const previousBodyWidth = bodyStyle.width;
    const previousHtmlOverflow = htmlStyle.overflow;

    bodyStyle.overflow = "hidden";
    htmlStyle.overflow = "hidden";
    bodyStyle.position = "fixed";
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.width = "100%";

    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      bodyStyle.overflow = previousBodyOverflow;
      bodyStyle.position = previousBodyPosition;
      bodyStyle.top = previousBodyTop;
      bodyStyle.width = previousBodyWidth;
      htmlStyle.overflow = previousHtmlOverflow;
      window.scrollTo(0, scrollY);
      returnFocusRef.current?.focus();
    };
  }, [handleKeyDown, returnFocusRef]);

  return (
    <div className="pb-drawer" role="presentation">
      <button
        type="button"
        className="pb-drawer__backdrop"
        onClick={onClose}
        aria-label={PROJECT_BUILDER_V1.closeDetailsCta}
        tabIndex={-1}
      />
      <aside
        ref={panelRef}
        className={`pb-drawer__panel pb-drawer__panel--${roadId}`}
        aria-labelledby="pb-drawer-title"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <header className="pb-drawer__header">
          <div>
            <p className="pb-drawer__eyebrow">{PROJECT_BUILDER_V1.learnMoreCta}</p>
            <h2 id="pb-drawer-title" className="pb-drawer__title">
              {presentation.name}
            </h2>
            <div className="pb-drawer__best-for">
              <p className="pb-drawer__best-for-label">{PROJECT_BUILDER_V1.bestForLabel}</p>
              <p className="pb-drawer__tagline">{tagline}</p>
            </div>
            <p className="pb-drawer__price">{job.priceDisplay}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="pb-drawer__close"
            onClick={onClose}
            aria-label={PROJECT_BUILDER_V1.closeDetailsCta}
          >
            <span aria-hidden>×</span>
          </button>
        </header>

        <div className="pb-drawer__body">
          <p className="pb-drawer__scope-note">
            Scope and timing below apply to this service only — not your full project timeline.
          </p>
          <ProjectBuilderJobDetailBlocks job={job} roadId={roadId} />
        </div>

        <footer className="pb-drawer__footer">
          {selected ? (
            <div className="pb-drawer__footer-selected">
              <p className="pb-drawer__in-project" role="status">
                <span className="pb-drawer__in-project-mark" aria-hidden>
                  ✓
                </span>
                {PROJECT_BUILDER_V1.alreadyInProjectDrawerCta}
              </p>
              <button type="button" className="pb-drawer__remove-link" onClick={onRemove}>
                {PROJECT_BUILDER_V1.removeFromProjectCta}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="utility-btn utility-btn--primary pb-drawer__action"
              onClick={onAdd}
              disabled={addDisabled}
            >
              {PROJECT_BUILDER_V1.addToProjectDrawerCta}
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
