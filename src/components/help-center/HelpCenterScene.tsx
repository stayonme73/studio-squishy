"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import HelpCenterQuickPolicyGuide from "@/components/help-center/HelpCenterQuickPolicyGuide";
import PolicyContentBlocks from "@/components/shared/PolicyContentBlocks";
import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import StudioBoardDevStatus from "@/components/studio-board/StudioBoardDevStatus";
import { helpCenter } from "@/config/help-center";
import {
  parseHelpCenterFromParam,
  resolveHelpCenterBackHref,
  resolveHelpCenterBackLabel,
  resolveHelpCenterProtectedAriaLabel,
  resolveHelpCenterProtectedHref,
} from "@/lib/help-center-navigation";
import { resolveHelpCenterView } from "@/lib/help-center-view";
import { readFinalDeliveryHelpReturnHref } from "@/lib/studio-final-delivery-room/return-state";
import { probeCustomerSessionSignedIn } from "@/lib/studio-intake-handoff";

const copy = helpCenter;

type HelpCenterSceneProps = {
  /** Server-read session. Do not start signed-out when a valid cookie already exists. */
  initialSignedIn?: boolean;
};

/** Studio Help Center — philosophy, FAQ, and policies from policies.ts */
export default function HelpCenterScene({ initialSignedIn = false }: HelpCenterSceneProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = useMemo(() => resolveHelpCenterView(), []);
  const from = parseHelpCenterFromParam(searchParams.get("from"));
  const [deliveryReturnHref, setDeliveryReturnHref] = useState<string | null>(null);
  const backHref = deliveryReturnHref ?? resolveHelpCenterBackHref(from);
  const backLabel = resolveHelpCenterBackLabel(from);
  const [signedIn, setSignedIn] = useState(initialSignedIn);

  useLayoutEffect(() => {
    if (from !== "deliverables") return;
    const href = readFinalDeliveryHelpReturnHref();
    if (!href) return;
    setDeliveryReturnHref(href);
    router.prefetch(href);
  }, [from, router]);

  useEffect(() => {
    let cancelled = false;
    void probeCustomerSessionSignedIn().then((ok) => {
      if (cancelled) return;
      /* Probe may only confirm a session. A timeout must not erase a valid cookie. */
      if (ok) setSignedIn(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const faqById = useMemo(() => new Map(view.faq.map((item) => [item.id, item])), [view.faq]);

  return (
    <UtilityPageFrame navId="help-center">
      <style>{`
        html:has([data-visual-proof]) .studio-environment-app .utility-page.utility-page--help-center :is(.utility-card, .utility-header__copy, .hc-qpg-card):not(.owner-qa):not(.owner-qa *):not(.fdr__feedback .fd-block) {
          background: color-mix(in srgb, #344653 92%, transparent) !important;
          background-color: color-mix(in srgb, #344653 92%, transparent) !important;
          border: 2px solid #c8b59b !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
        }
        html:has([data-visual-proof]) .studio-environment-app .utility-page.utility-page--help-center table.pkg-compare__table:not(.owner-qa):not(.owner-qa *):not(.fdr__feedback .fd-block) {
          background: #4d6474 !important;
          background-color: #4d6474 !important;
          border: 2px solid #c8b59b !important;
        }
        html:has([data-visual-proof]) .studio-environment-app .utility-page.utility-page--help-center nav.hc-toc a.hc-toc__link:not(.owner-qa):not(.owner-qa *) {
          display: inline-flex !important;
          align-items: center !important;
          min-height: 44px !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 700 !important;
          text-decoration: underline !important;
          text-underline-offset: 0.15em !important;
        }
        html:has([data-visual-proof]) .studio-environment-app .utility-page.utility-page--help-center :is(.pkg-compare a.hc-toc__link, a.hc-qpg-card__link, a.hc-footer__link):not(.owner-qa):not(.owner-qa *) {
          display: inline-flex !important;
          align-items: center !important;
          min-height: 44px !important;
          color: #5eedd0 !important;
          -webkit-text-fill-color: #5eedd0 !important;
          font-weight: 700 !important;
          text-decoration: underline !important;
          text-underline-offset: 0.15em !important;
        }
        html:has([data-visual-proof]) .studio-environment-app .utility-page.utility-page--help-center :is(nav a.utility-subnav__link):not(.owner-qa *):not([aria-current="page"]):not(.utility-subnav__link--active):not(.sb-nav__item--active):not(.is-active):not(:active):not(.is-pressed):not([data-pressed="true"]):not([class*="routeCard"]):not(.hc-toc__link) {
          background: color-mix(in srgb, #344653 92%, transparent) !important;
          background-color: color-mix(in srgb, #344653 92%, transparent) !important;
          border: 2px solid #c8b59b !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
        }
        html:has([data-visual-proof]) .studio-environment-app .utility-page.utility-page--help-center a.utility-subnav__link.utility-subnav__link--active:not(.owner-qa):not(.owner-qa *) {
          background: #43b7a2 !important;
          background-color: #43b7a2 !important;
          border: 2px solid #43b7a2 !important;
          color: #111111 !important;
          -webkit-text-fill-color: #111111 !important;
        }
        @media (prefers-reduced-motion: reduce) {
          html:has([data-visual-proof]) .studio-environment-app .utility-page.utility-page--help-center :is(.utility-card, .utility-header__copy, .hc-qpg-card):not(.owner-qa):not(.owner-qa *):not(.fdr__feedback .fd-block) {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            background: #344653 !important;
            background-color: #344653 !important;
          }
        }
      `}</style>
      <div className="utility-page utility-page--help-center" aria-label="Studio Help Center">
        <UtilityPageHeader
          backHref={backHref}
          backLabel={backLabel}
          activeNav="help-center"
          title={copy.pageTitle}
          lead={copy.lead}
          signedIn={signedIn}
        />

        <nav className="hc-toc utility-card" aria-label="On this page">
          <p className="hc-toc__title">{copy.toc.title}</p>
          <ul className="hc-toc__list">
            {copy.toc.items.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="hc-toc__link">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="utility-grid hc-grid">
          <section
            id="quick-guide"
            className="utility-card hc-card--packages"
            aria-labelledby="hc-quick-guide-title"
          >
            <h2 id="hc-quick-guide-title" className="utility-card__title">
              {copy.sections.quickGuide}
            </h2>
            <HelpCenterQuickPolicyGuide />
          </section>

          <section
            id="about"
            className="utility-card hc-card--about"
            aria-labelledby="hc-about-title"
          >
            <h2 id="hc-about-title" className="utility-card__title">
              {copy.sections.about}
            </h2>
            <PolicyContentBlocks blocks={view.about.blocks} className="hc-body" />
          </section>

          <section
            id="philosophy"
            className="utility-card hc-card--philosophy"
            aria-labelledby="hc-philosophy-title"
          >
            <h2 id="hc-philosophy-title" className="utility-card__title">
              {copy.sections.philosophy}
            </h2>
            <article aria-labelledby="hc-philosophy-question">
              <h3 id="hc-philosophy-question" className="hc-philosophy__question">
                {view.philosophy.title}
              </h3>
              <PolicyContentBlocks blocks={view.philosophy.blocks} className="hc-body" />
            </article>
          </section>

          <section
            id="faq"
            className="utility-card hc-card--faq"
            aria-labelledby="hc-faq-title"
          >
            <h2 id="hc-faq-title" className="utility-card__title">
              {copy.sections.faq}
            </h2>

            {view.faqGroups.map((group) => (
              <div key={group.id} className="hc-faq-group">
                <h3 className="hc-faq-group__title">{group.label}</h3>
                <dl className="hc-faq">
                  {group.faqIds.map((faqId) => {
                    const item = faqById.get(faqId);
                    if (!item) return null;
                    return (
                      <div key={item.id} id={`faq-${item.id}`} className="hc-faq__item">
                        <dt className="hc-faq__question">{item.question}</dt>
                        <dd className="hc-faq__answer">
                          <PolicyContentBlocks blocks={item.blocks} />
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </section>

          <section
            id="policies"
            className="utility-card hc-card--policies"
            aria-labelledby="hc-policies-title"
          >
            <h2 id="hc-policies-title" className="utility-card__title">
              {copy.sections.policies}
            </h2>
            <div className="hc-policies">
              {view.policies.map((item) => (
                <article key={item.id} id={`policy-${item.id}`} className="hc-policies__item">
                  <h3 className="hc-policies__title">{item.title}</h3>
                  <PolicyContentBlocks blocks={item.blocks} className="hc-body" />
                </article>
              ))}
            </div>
          </section>

          <footer className="utility-card hc-card--footer">
            <p className="hc-footer__hint">{copy.footer.campaignHint}</p>
            <div className="hc-footer__links">
              <Link
                href={resolveHelpCenterProtectedHref(copy.routes.studioBoard, signedIn)}
                className="hc-footer__link"
                aria-label={resolveHelpCenterProtectedAriaLabel(
                  copy.footer.studioBoardLabel,
                  copy.routes.studioBoard,
                  signedIn,
                )}
              >
                {copy.footer.studioBoardLabel} →
              </Link>
              <Link
                href={resolveHelpCenterProtectedHref(
                  `${copy.routes.studioBoard}#sb-project-details`,
                  signedIn,
                )}
                className="hc-footer__link"
                aria-label={resolveHelpCenterProtectedAriaLabel(
                  "Project details",
                  copy.routes.studioBoard,
                  signedIn,
                )}
              >
                Project details →
              </Link>
            </div>
          </footer>
        </div>

        <StudioBoardDevStatus placement="sidebar" />
      </div>
    </UtilityPageFrame>
  );
}
