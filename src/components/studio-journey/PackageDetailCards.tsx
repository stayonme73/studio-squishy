import type { PackageDetailSection } from "@/config/studio-customer-journey-condense-v1";

import "@/components/project-builder/project-builder-job-details.css";

function cardClass(kind: PackageDetailSection["kind"]): string {
  if (kind === "purpose") return "pb-drawer-details__card pb-drawer-details__card--purpose";
  if (kind === "includes") return "pb-drawer-details__card pb-drawer-details__card--includes";
  if (kind === "excludes") {
    return "pb-drawer-details__card pb-drawer-details__card--excludes pb-drawer-details__card--studioDoesNotProvide";
  }
  if (kind === "changes") {
    return "pb-drawer-details__card pb-drawer-details__card--excludes pb-drawer-details__card--purchasedDeliverableChanges";
  }
  if (kind === "revision") return "pb-drawer-details__card pb-drawer-details__card--revision";
  if (kind === "needs") return "pb-drawer-details__card pb-drawer-details__card--needs";
  return "pb-drawer-details__card pb-drawer-details__card--price";
}

function listClass(kind: PackageDetailSection["kind"]): string {
  if (kind === "includes") return "pb-drawer-details__list pb-drawer-details__list--includes";
  if (kind === "excludes") return "pb-drawer-details__list pb-drawer-details__list--excludes";
  return "pb-drawer-details__list pb-drawer-details__list--needs";
}

export default function PackageDetailCards({
  name,
  sections,
}: {
  name: string;
  sections: readonly PackageDetailSection[];
}) {
  return (
    <div className="pb-job-details-surface pb-drawer-details" aria-label={`${name} details`}>
      {sections.map((section) => (
        <section key={section.id} className={cardClass(section.kind)}>
          <h3 className="pb-drawer-details__heading">
            {section.icon ? (
              <span className="pb-drawer-details__icon" aria-hidden>
                {section.icon}
              </span>
            ) : null}
            {section.label}
          </h3>
          {section.prose ? <p className="pb-drawer-details__prose">{section.prose}</p> : null}
          {section.items?.length ? (
            <ul className={listClass(section.kind)}>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
