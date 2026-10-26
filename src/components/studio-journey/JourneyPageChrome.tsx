"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";

import { homepageBrand, homepageVoice } from "@/config/studio-homepage-lobby-rebuild-v1";
import { studioCustomerJourneyCondenseV1 } from "@/config/studio-customer-journey-condense-v1";
import HomepageStudioVoice from "@/components/studio-homepage/HomepageStudioVoice";

import { usePinnedHomepageMast } from "@/components/studio-homepage/use-pinned-homepage-mast";
import { studioBuildManrope } from "@/fonts/studio-build-manrope";
import "@/components/studio-homepage/studio-homepage-lobby.css";
import "./studio-journey-condense.css";

const OpenStudioVoiceContext = createContext<() => void>(() => {});

export function useOpenJourneyStudioVoice(): () => void {
  return useContext(OpenStudioVoiceContext);
}

export function AskStudioVoiceButton({
  label,
  className = "studio-homepage__btn-secondary",
  dataAttribute,
  icon,
}: {
  label: string;
  className?: string;
  dataAttribute?: string;
  icon?: ReactNode;
}) {
  const openStudioVoice = useOpenJourneyStudioVoice();
  return (
    <button
      type="button"
      className={className}
      data-package-cta={dataAttribute}
      onClick={openStudioVoice}
    >
      {icon}
      {label}
    </button>
  );
}

type Props = {
  page: "package-detail" | "build-your-project" | "review-and-pay";
  helpFrom?: string;
  children: ReactNode;
};

const HELP_FROM = {
  "package-detail": "/help-center?from=package-detail",
  "build-your-project": "/help-center?from=project-builder",
  "review-and-pay": "/help-center?from=checkout",
} as const;

export default function JourneyPageChrome({ page, helpFrom, children }: Props) {
  usePinnedHomepageMast();
  const routes = studioCustomerJourneyCondenseV1.routes;
  const helpHref = helpFrom
    ? `/help-center?from=${helpFrom}`
    : HELP_FROM[page];
  const [studioVoiceOpen, setStudioVoiceOpen] = useState(false);
  const openStudioVoice = () => setStudioVoiceOpen(true);
  const themePage =
    page === "build-your-project" || page === "package-detail" || page === "review-and-pay";

  return (
    <OpenStudioVoiceContext.Provider value={openStudioVoice}>
    <div
      className={`studio-homepage studio-journey${themePage ? ` ${studioBuildManrope.className}` : ""}`}
      data-journey-page={page}
    >
      {themePage ? (
        <style>{`
          html:has(.studio-environment-app) .studio-homepage.studio-journey[data-journey-page="package-detail"] .pb-drawer-details__card,
          html:has(.studio-environment-app) .studio-homepage.studio-journey[data-journey-page="review-and-pay"] .pb-drawer-details__card,
          html:has(.studio-environment-app) .studio-homepage.studio-journey[data-journey-page="review-and-pay"] .co-card,
          html:has(.studio-environment-app) .studio-homepage.studio-journey[data-journey-page="review-and-pay"] [data-panel="intake"] .route-map-social-intake__card {
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
          }
          @media (prefers-reduced-motion: reduce) {
            html:has(.studio-environment-app) .studio-homepage.studio-journey[data-journey-page="package-detail"] .pb-drawer-details__card,
            html:has(.studio-environment-app) .studio-homepage.studio-journey[data-journey-page="review-and-pay"] .pb-drawer-details__card,
            html:has(.studio-environment-app) .studio-homepage.studio-journey[data-journey-page="review-and-pay"] .co-card,
            html:has(.studio-environment-app) .studio-homepage.studio-journey[data-journey-page="review-and-pay"] [data-panel="intake"] .route-map-social-intake__card {
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
            }
          }
        `}</style>
      ) : null}
      <header className="studio-homepage__mast">
        <div className="studio-homepage__inner studio-homepage__mast-row">
          <Link href={routes.home} className="studio-homepage__brand">
            <span className="studio-homepage__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <circle
                  cx="12"
                  cy="12"
                  r="10.25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <text
                  x="12"
                  y="16.1"
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="11"
                  fontWeight="700"
                >
                  S
                </text>
              </svg>
            </span>
            <span className="studio-homepage__brand-full">{homepageBrand.mark}</span>
            <span className="studio-homepage__brand-short">The Studio</span>
          </Link>
          <div className="studio-homepage__actions">
            <button
              type="button"
              className="studio-homepage__btn-secondary studio-homepage__voice-entry"
              aria-label={homepageVoice.label}
              onClick={openStudioVoice}
            >
              {homepageVoice.label}
            </button>
            <Link href={helpHref} className="studio-homepage__btn-secondary">
              Help Center
            </Link>
            <Link href={routes.myStudio} className="studio-homepage__btn-secondary">
              My Studio
            </Link>
          </div>
        </div>
      </header>
      <HomepageStudioVoice
        open={studioVoiceOpen}
        onClose={() => setStudioVoiceOpen(false)}
        showWalk={false}
      />
      {children}
    </div>
    </OpenStudioVoiceContext.Provider>
  );
}
