"use client";

import { ROUTE_MAP_REVISION_DRAWER_ITEMS } from "@/catalog/route-map-shared-copy";
import type { RouteMapJob, RouteMapRoadId } from "@/config/route-map-v1";
import { classifyServiceExclusions } from "@/lib/project-builder-exclusion-groups";
import { expandDrawerTimelineItems } from "@/lib/project-builder-drawer-timing";
import { resolveProjectBuilderDrawerPurpose } from "@/lib/project-builder-drawer-tagline";
import { resolveProjectBuilderJobPresentation, appliesUpdateExitPresentation } from "@/lib/project-builder-update-exit-copy";
import { expandScannableCopyItems } from "@/lib/project-builder-scannable-copy";

type Props = {
  job: RouteMapJob;
  roadId: RouteMapRoadId;
};

const SECTIONS = {
  purpose: { label: "Purpose" },
  includes: { label: "Included", icon: "✅" },
  studioDoesNotProvide: { label: "The Studio Does Not Offer", icon: "❌" },
  purchasedDeliverableChanges: {
    label: "Changes to Your Purchased Deliverable",
    icon: "🔄",
  },
  revision: { label: "Revisions", icon: "🔄" },
  timing: { label: "Timeline", icon: "⏱" },
  responsibilities: { label: "You'll Handle", icon: "👤" },
  price: { label: "Price", icon: "💰" },
} as const;

function ExclusionGroup({
  kind,
  items,
}: {
  kind: keyof Pick<typeof SECTIONS, "studioDoesNotProvide" | "purchasedDeliverableChanges">;
  items: readonly string[];
}) {
  if (items.length === 0) return null;

  const section = SECTIONS[kind];

  return (
    <section className={`pb-drawer-details__card pb-drawer-details__card--excludes pb-drawer-details__card--${kind}`}>
      <h3 className="pb-drawer-details__heading">
        <span className="pb-drawer-details__icon" aria-hidden>
          {section.icon}
        </span>
        {section.label}
      </h3>
      <ul className="pb-drawer-details__list pb-drawer-details__list--excludes">
        {items.map((item, index) => (
          <li key={`${kind}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

/** Scannable service detail cards for the in-workspace Learn More drawer. */
export default function ProjectBuilderJobDetailBlocks({ job, roadId }: Props) {
  const presentation = resolveProjectBuilderJobPresentation(job, roadId);
  const includes = expandScannableCopyItems(presentation.deliverables);
  const exclusionGroups = classifyServiceExclusions(presentation.exclusions);
  const responsibilities = expandScannableCopyItems(presentation.clientResponsibilities);
  const timeline = expandDrawerTimelineItems(job.timingLabel);
  const drawerPurpose = appliesUpdateExitPresentation(roadId, job.id)
    ? presentation.drawerPurpose
    : resolveProjectBuilderDrawerPurpose(job);

  return (
    <div className="pb-drawer-details" aria-label={`${presentation.name} details`}>
      <section className="pb-drawer-details__card pb-drawer-details__card--purpose">
        <h3 className="pb-drawer-details__heading">{SECTIONS.purpose.label}</h3>
        <p className="pb-drawer-details__prose">{drawerPurpose}</p>
      </section>

      <section className="pb-drawer-details__card pb-drawer-details__card--includes">
        <h3 className="pb-drawer-details__heading">
          <span className="pb-drawer-details__icon" aria-hidden>
            {SECTIONS.includes.icon}
          </span>
          {SECTIONS.includes.label}
        </h3>
        <ul className="pb-drawer-details__list pb-drawer-details__list--includes">
          {includes.map((item, index) => (
            <li key={`include-${index}`}>{item}</li>
          ))}
        </ul>
      </section>

      <ExclusionGroup kind="studioDoesNotProvide" items={exclusionGroups.studioDoesNotProvide} />
      <ExclusionGroup
        kind="purchasedDeliverableChanges"
        items={exclusionGroups.purchasedDeliverableChanges}
      />

      <section className="pb-drawer-details__card pb-drawer-details__card--revision">
        <h3 className="pb-drawer-details__heading">
          <span className="pb-drawer-details__icon" aria-hidden>
            {SECTIONS.revision.icon}
          </span>
          {SECTIONS.revision.label}
        </h3>
        <ul className="pb-drawer-details__list pb-drawer-details__list--needs">
          {ROUTE_MAP_REVISION_DRAWER_ITEMS.map((item, index) => (
            <li key={`revision-${index}`}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="pb-drawer-details__card pb-drawer-details__card--timing">
        <h3 className="pb-drawer-details__heading">
          <span className="pb-drawer-details__icon" aria-hidden>
            {SECTIONS.timing.icon}
          </span>
          {SECTIONS.timing.label}
        </h3>
        <ul className="pb-drawer-details__list pb-drawer-details__list--needs">
          {timeline.map((item, index) => (
            <li key={`timeline-${index}`}>{item}</li>
          ))}
        </ul>
      </section>

      {responsibilities.length > 0 ? (
        <section className="pb-drawer-details__card pb-drawer-details__card--needs">
          <h3 className="pb-drawer-details__heading">
            <span className="pb-drawer-details__icon" aria-hidden>
              {SECTIONS.responsibilities.icon}
            </span>
            {SECTIONS.responsibilities.label}
          </h3>
          <ul className="pb-drawer-details__list pb-drawer-details__list--needs">
            {responsibilities.map((item, index) => (
              <li key={`responsibility-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="pb-drawer-details__card pb-drawer-details__card--price">
        <h3 className="pb-drawer-details__heading">
          <span className="pb-drawer-details__icon" aria-hidden>
            {SECTIONS.price.icon}
          </span>
          {SECTIONS.price.label}
        </h3>
        <p className="pb-drawer-details__prose">{job.priceDisplay}</p>
      </section>
    </div>
  );
}
