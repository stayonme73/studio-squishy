"use client";

import { PROJECT_BUILDER_V1 } from "@/config/project-builder-v1";
import type { RouteMapJob, RouteMapRoadId } from "@/config/route-map-v1";
import { resolveProjectBuilderJobPresentation } from "@/lib/project-builder-update-exit-copy";
import { resolveProjectBuilderServiceCue } from "@/lib/project-builder-service-cue";

type Props = {
  job: RouteMapJob;
  roadId: RouteMapRoadId;
  selected: boolean;
  onOpenDetails: () => void;
  onAdd: () => void;
  onRemove: () => void;
  addDisabled?: boolean;
};

/** Mini-product service card — explore first, add when ready. */
export default function ProjectBuilderDeliverableTile({
  job,
  roadId,
  selected,
  onOpenDetails,
  onAdd,
  onRemove,
  addDisabled = false,
}: Props) {
  const cue = resolveProjectBuilderServiceCue(job.intakeType);
  const presentation = resolveProjectBuilderJobPresentation(job, roadId);
  const taglineSource = presentation.tagline || job.purpose;

  return (
    <article
      className={`pb-card pb-card--${roadId}${selected ? " pb-card--selected" : ""}`}
      aria-label={presentation.name}
    >
      <button type="button" className="pb-card__explore" onClick={onOpenDetails}>
        <div className="pb-card__identity">
          <span className="pb-card__cue" aria-hidden>
            {cue}
          </span>
          <div className="pb-card__headline">
            <h3 className="pb-card__name">{presentation.name}</h3>
            <p className="pb-card__price">{job.priceDisplay}</p>
          </div>
          <span className="pb-card__arrow" aria-hidden>
            →
          </span>
        </div>
        {taglineSource ? <p className="pb-card__desc">{presentation.purpose}</p> : null}
      </button>

      <footer className="pb-card__footer">
        {selected ? <span className="pb-card__badge">{PROJECT_BUILDER_V1.inProjectBadge}</span> : null}
        <div className="pb-card__actions">
          <button type="button" className="pb-card__learn" onClick={onOpenDetails}>
            {PROJECT_BUILDER_V1.learnMoreCta}
            <span className="pb-card__learn-arrow" aria-hidden>
              →
            </span>
          </button>
          {selected ? (
            <button type="button" className="pb-card__remove-link" onClick={onRemove}>
              {PROJECT_BUILDER_V1.removeFromProjectCta}
            </button>
          ) : (
            <button
              type="button"
              className="pb-card__add"
              onClick={onAdd}
              disabled={addDisabled}
            >
              {PROJECT_BUILDER_V1.addToProjectCta}
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
