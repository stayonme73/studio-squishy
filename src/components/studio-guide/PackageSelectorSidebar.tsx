"use client";

import { studioGuide } from "@/config/studio-guide";

import { ChevronRightIcon } from "./PackageIcons";

type Props = {
  packageIndex: number;
  onPackageChange: (index: number) => void;
  onHelpClick: () => void;
};

export default function PackageSelectorSidebar({
  packageIndex,
  onPackageChange,
  onHelpClick,
}: Props) {
  return (
    <aside className="guide-sidebar" aria-label="Choose a package">
      <div className="guide-sidebar-list" role="tablist" aria-orientation="vertical">
        {studioGuide.packages.map((pkg, index) => {
          const active = index === packageIndex;
          return (
            <button
              key={pkg.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`guide-sidebar-card guide-sidebar-card--${pkg.id}${active ? " guide-sidebar-card--active" : ""}`}
              onClick={() => onPackageChange(index)}
            >
              <span className="guide-sidebar-icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={studioGuide.assets.icons[pkg.id]}
                  alt=""
                  className="guide-sidebar-icon-img"
                  draggable={false}
                />
              </span>
              <span className="guide-sidebar-card-copy">
                <span className="guide-sidebar-card-title">{pkg.label}</span>
                <span className={`guide-sidebar-card-tagline guide-sidebar-card-tagline--${pkg.accent}`}>
                  {pkg.tagline}
                </span>
                <span className="guide-sidebar-card-desc">{pkg.sidebarDescription}</span>
              </span>
              <span className="guide-sidebar-card-arrow" aria-hidden>
                <ChevronRightIcon className="guide-sidebar-card-chevron" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="guide-sidebar-help">
        <div className="guide-sidebar-help-copy">
          <p className="guide-sidebar-help-heading">{studioGuide.helpCard.title}</p>
          <p className="guide-sidebar-help-desc">{studioGuide.helpCard.description}</p>
          <button type="button" className="guide-sidebar-help-cta" onClick={onHelpClick}>
            {studioGuide.helpCard.cta}
          </button>
        </div>
      </div>
    </aside>
  );
}
