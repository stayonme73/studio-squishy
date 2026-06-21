"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import PolicyContentBlocks from "@/components/shared/PolicyContentBlocks";
import PackageComparisonTable from "@/components/shared/PackageComparisonTable";
import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import StudioBoardDevStatus from "@/components/studio-board/StudioBoardDevStatus";
import { helpCenter, type HelpCenterFrom } from "@/config/help-center";
import { resolveHelpCenterView } from "@/lib/help-center-view";

const copy = helpCenter;

function parseFromParam(value: string | null): HelpCenterFrom | null {
  if (value === "campaign-details" || value === "studio-board" || value === "payment") {
    return value;
  }
  return null;
}

/** Studio Help Center — philosophy, FAQ, and policies from policies.ts */
export default function HelpCenterScene() {
  const searchParams = useSearchParams();
  const view = useMemo(() => resolveHelpCenterView(), []);
  const from = parseFromParam(searchParams.get("from"));

  const backHref =
    from === "campaign-details"
      ? copy.routes.campaignDetails
      : from === "payment"
        ? "/payment"
        : copy.routes.studioBoard;

  const faqById = useMemo(() => new Map(view.faq.map((item) => [item.id, item])), [view.faq]);

  return (
    <UtilityPageFrame navId="help-center">
      <div className="utility-page" aria-label="Studio Help Center">
        <UtilityPageHeader
          backHref={backHref}
          activeNav="help-center"
          title={copy.pageTitle}
          lead={copy.lead}
          helpCenterFrom={from ?? "studio-board"}
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
            id="packages"
            className="utility-card hc-card--packages"
            aria-labelledby="hc-packages-title"
          >
            <h2 id="hc-packages-title" className="utility-card__title">
              {copy.sections.packages}
            </h2>
            <PackageComparisonTable showTitle={false} />
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
              <Link href={copy.routes.studioBoard} className="hc-footer__link">
                {copy.footer.studioBoardLabel} →
              </Link>
              <Link href={copy.routes.campaignDetails} className="hc-footer__link">
                {copy.footer.campaignDetailsLabel} →
              </Link>
            </div>
          </footer>
        </div>

        <StudioBoardDevStatus placement="sidebar" />
      </div>
    </UtilityPageFrame>
  );
}
