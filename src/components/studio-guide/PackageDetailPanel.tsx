"use client";

import { packageStartCta, studioGuide } from "@/config/studio-guide";

import { CheckIcon, FeatureIcon } from "./PackageIcons";

type Props = {
  packageIndex: number;
  onCtaClick: () => void;
};

export default function PackageDetailPanel({ packageIndex, onCtaClick }: Props) {
  const pkg = studioGuide.packages[packageIndex];
  const includesMid = Math.ceil(pkg.includes.length / 2);
  const includesLeft = pkg.includes.slice(0, includesMid);
  const includesRight = pkg.includes.slice(includesMid);

  return (
    <section className="guide-detail" aria-label={`${pkg.label} package details`}>
      <div className={`guide-detail-panel guide-detail-panel--${pkg.id}`}>
        <div className={`guide-detail-hero-banner guide-detail-hero-banner--${pkg.id}`} aria-hidden>
          <div className="guide-detail-hero-glow" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={studioGuide.assets.heroes[pkg.id]}
            alt=""
            className="guide-detail-hero"
            draggable={false}
          />
        </div>

        <div className="guide-detail-intro">
          <h2 className="guide-detail-name">{pkg.label}</h2>
          <p className={`guide-detail-tagline guide-detail-tagline--${pkg.accent}`}>{pkg.tagline}</p>
          <p className={`guide-detail-mood guide-detail-mood--${pkg.id}`}>
            {studioGuide.packageMood[pkg.id]}
          </p>
        </div>

        <div className="guide-detail-features">
          {pkg.features.map((feature) => (
            <div
              key={feature.title}
              className={`guide-detail-feature guide-detail-feature--${feature.color}`}
            >
              <FeatureIcon name={feature.icon} className="guide-detail-feature-icon" />
              <p className={`guide-detail-feature-title guide-detail-feature-title--${feature.color}`}>
                {feature.title}
              </p>
              <p className="guide-detail-feature-desc">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="guide-detail-includes">
          <p className="guide-detail-includes-label">INCLUDES:</p>
          <div className="guide-detail-includes-grid">
            <ul>
              {includesLeft.map((item) => (
                <li key={item}>
                  <span className="guide-detail-check-wrap">
                    <CheckIcon className="guide-detail-check" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <ul>
              {includesRight.map((item) => (
                <li key={item}>
                  <span className="guide-detail-check-wrap">
                    <CheckIcon className="guide-detail-check" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="guide-detail-next">
          <p className="guide-detail-next-label">{studioGuide.whatHappensNext.title}</p>
          <ol className="guide-detail-next-steps">
            {studioGuide.whatHappensNext.steps.map((step, index) => (
              <li key={step}>
                <span className="guide-detail-next-num">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <button type="button" className="guide-detail-cta" onClick={onCtaClick}>
          <span className="guide-detail-cta-label">{packageStartCta(pkg.id)}</span>
        </button>
      </div>
    </section>
  );
}
