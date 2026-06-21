"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import FinalDeliveryAtmosphere from "@/components/deliverables/FinalDeliveryAtmosphere";
import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import StudioBoardDevStatus from "@/components/studio-board/StudioBoardDevStatus";
import {
  deliverables,
  type CampaignDeliverablesPackage,
} from "@/config/deliverables";
import { copyTextToClipboard, downloadTextFile } from "@/lib/copy-download";
import { resolveDeliverablesView } from "@/lib/deliverables-view";
import { useCurrentCampaign } from "@/lib/use-current-campaign";

const { summary, hero, sections, categories, footer, empty, routes } = deliverables;

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await copyTextToClipboard(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [text]);

  return (
    <button type="button" className="fd-copy" onClick={handleCopy}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="8" y="8" width="12" height="14" rx="1.5" />
        <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {copied ? sections.copySuccess : label ?? sections.copyLabel}
    </button>
  );
}

function SectionDownloadButton({ filename, content }: { filename: string; content: string }) {
  return (
    <button
      type="button"
      className="fd-block__download"
      onClick={() => downloadTextFile(filename, content)}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 4v10M8 11l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 19h14" strokeLinecap="round" />
      </svg>
      {sections.downloadAllLabel}
    </button>
  );
}

function buildSocialDownload(pkg: CampaignDeliverablesPackage) {
  return pkg.socialPosts
    .map((post) => `${post.label}\n${post.caption}`)
    .join("\n\n---\n\n");
}

function buildEmailDownload(pkg: CampaignDeliverablesPackage) {
  return pkg.emails
    .map((email) => `${email.label}\nSubject: ${email.subject}\n\n${email.preview}`)
    .join("\n\n---\n\n");
}

function buildSmsDownload(pkg: CampaignDeliverablesPackage) {
  return pkg.smsMessages.map((sms) => `${sms.label}\n${sms.message}`).join("\n\n---\n\n");
}

function buildVideoDownload(pkg: CampaignDeliverablesPackage) {
  return pkg.videoScripts
    .map((script) => `${script.label}\nHook: ${script.hook}\nCTA: ${script.cta}`)
    .join("\n\n---\n\n");
}

function buildCalendarDownload(pkg: CampaignDeliverablesPackage) {
  return pkg.calendar
    .map((week) => `${week.label}\n${week.items.map((item) => `• ${item}`).join("\n")}`)
    .join("\n\n");
}

/** Final Delivery — V1 deliverables handoff page. */
export default function DeliverablesScene() {
  const searchParams = useSearchParams();
  const previewDelivered =
    searchParams.get("preview") === "delivered" || searchParams.get("room") === "1";
  const { campaign, ready } = useCurrentCampaign();

  const view = useMemo(
    () => resolveDeliverablesView(campaign, { previewDelivered }),
    [campaign, previewDelivered],
  );
  const pkg = view.package;

  if (!ready) {
    return (
      <UtilityPageFrame navId="deliverables">
        <div className="utility-page" aria-busy="true">
          <div className="utility-shell utility-shell--loading" />
        </div>
      </UtilityPageFrame>
    );
  }

  const isReady = view.state === "ready" && pkg;

  return (
    <UtilityPageFrame navId="deliverables">
      <div className={`utility-page${isReady ? " utility-page--delivery" : ""}`} aria-label="Final Delivery">
        {isReady ? <FinalDeliveryAtmosphere /> : null}
        <UtilityPageHeader
          backHref={routes.studioBoard}
          activeNav="deliverables"
          title={deliverables.pageTitle}
          lead={isReady ? undefined : deliverables.pageSubtitle}
        />

      {!isReady ? (
        <div className="utility-shell fd-empty">
          <p className="fd-empty__title">
            {view.state === "no-campaign" ? empty.noCampaign : empty.preparing}
          </p>
          {view.state === "preparing" ? (
            <p className="fd-empty__hint">{empty.preparingHint}</p>
          ) : null}
          <Link href={routes.studioBoard} className="utility-btn utility-btn--primary">
            {empty.cta} →
          </Link>
        </div>
      ) : (
        <>
          <section className="fd-hero fd-hero--compact" aria-label="Campaign complete">
            <p className="fd-hero__badge">{hero.badge}</p>
            <h2 className="fd-hero__title">{hero.title}</h2>
            <p className="fd-hero__lead">{hero.lead}</p>

            <div className="fd-campaign-strip">
              <dl className="fd-campaign-strip__facts">
                <div>
                  <dt>{summary.labels.campaignName}</dt>
                  <dd>{view.campaignName}</dd>
                </div>
                <div>
                  <dt>{summary.labels.selectedOption}</dt>
                  <dd>{view.selectedOption}</dd>
                </div>
                <div>
                  <dt>{summary.labels.completionDate}</dt>
                  <dd>{view.completionDate}</dd>
                </div>
                <div>
                  <dt>{summary.labels.status}</dt>
                  <dd>
                    <span className="fd-summary__status">{view.statusLabel}</span>
                  </dd>
                </div>
              </dl>
            </div>

            <p className="fd-hero__footnote">{hero.footnote}</p>
          </section>

          <section className="fd-deliverables" aria-labelledby="fd-deliverables-title">
            <h2 id="fd-deliverables-title" className="fd-deliverables__title">
              {sections.heading}
            </h2>
            <p className="fd-deliverables__subtitle">{sections.subheading}</p>

            <div className="fd-deliverables__grid">
              <article className="fd-block fd-block--social">
                <header className="fd-block__head fd-block__head--social">
                  <div className="fd-block__head-main">
                    <span className="fd-block__icon fd-block__icon--social" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="M7 10v4M12 8v8M17 11v5" strokeLinecap="round" />
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                      </svg>
                    </span>
                    <h3>{categories.social.title}</h3>
                  </div>
                  <SectionDownloadButton
                    filename={categories.social.filename}
                    content={buildSocialDownload(pkg)}
                  />
                </header>
                <div className="fd-block__body">
                  <div className="fd-block__items fd-block__items--3">
                    {pkg.socialPosts.map((post) => (
                      <div key={post.id} className="fd-item">
                        <p className="fd-item__label">{post.label}</p>
                        <p className="fd-item__text">{post.caption}</p>
                        <CopyButton text={post.caption} />
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="fd-block fd-block--email">
                <header className="fd-block__head fd-block__head--email">
                  <div className="fd-block__head-main">
                    <span className="fd-block__icon fd-block__icon--email" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <path d="M2 7l10 7 10-7" />
                      </svg>
                    </span>
                    <h3>{categories.email.title}</h3>
                  </div>
                  <SectionDownloadButton
                    filename={categories.email.filename}
                    content={buildEmailDownload(pkg)}
                  />
                </header>
                <div className="fd-block__body">
                  <div className="fd-block__items fd-block__items--3">
                    {pkg.emails.map((email) => (
                      <div key={email.id} className="fd-item">
                        <p className="fd-item__label">{email.label}</p>
                        <p className="fd-item__meta">
                          <strong>Subject:</strong> {email.subject}
                        </p>
                        <p className="fd-item__text">{email.preview}</p>
                        <CopyButton text={`Subject: ${email.subject}\n\n${email.preview}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="fd-block fd-block--sms">
                <header className="fd-block__head fd-block__head--sms">
                  <div className="fd-block__head-main">
                    <span className="fd-block__icon fd-block__icon--sms" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="M4 5h16v11H7l-3 3V5z" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <h3>{categories.sms.title}</h3>
                  </div>
                  <SectionDownloadButton
                    filename={categories.sms.filename}
                    content={buildSmsDownload(pkg)}
                  />
                </header>
                <div className="fd-block__body">
                  <div className="fd-block__items fd-block__items--3">
                    {pkg.smsMessages.map((sms) => (
                      <div key={sms.id} className="fd-item">
                        <p className="fd-item__label">{sms.label}</p>
                        <p className="fd-item__text">{sms.message}</p>
                        <CopyButton text={sms.message} />
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="fd-block fd-block--video">
                <header className="fd-block__head fd-block__head--video">
                  <div className="fd-block__head-main">
                    <span className="fd-block__icon fd-block__icon--video" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <rect x="3" y="6" width="13" height="12" rx="1.5" />
                        <path d="M16 10l5-3v10l-5-3" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <h3>{categories.video.title}</h3>
                  </div>
                  <SectionDownloadButton
                    filename={categories.video.filename}
                    content={buildVideoDownload(pkg)}
                  />
                </header>
                <div className="fd-block__body">
                  <div className="fd-block__items fd-block__items--2">
                    {pkg.videoScripts.map((script) => (
                      <div key={script.id} className="fd-item">
                        <p className="fd-item__label">{script.label}</p>
                        <p className="fd-item__meta">
                          <strong>Hook:</strong> {script.hook}
                        </p>
                        <p className="fd-item__meta">
                          <strong>CTA:</strong> {script.cta}
                        </p>
                        <CopyButton text={`Hook: ${script.hook}\nCTA: ${script.cta}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="fd-block fd-block--calendar">
                <header className="fd-block__head fd-block__head--calendar">
                  <div className="fd-block__head-main">
                    <span className="fd-block__icon fd-block__icon--calendar" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M3 10h18M8 2v4M16 2v4" />
                      </svg>
                    </span>
                    <h3>{categories.calendar.title}</h3>
                  </div>
                  <SectionDownloadButton
                    filename={categories.calendar.filename}
                    content={buildCalendarDownload(pkg)}
                  />
                </header>
                <div className="fd-block__body">
                  <div className="fd-block__items fd-block__items--4">
                    {pkg.calendar.map((week) => (
                      <div key={week.id} className="fd-item fd-item--calendar">
                        <p className="fd-item__label">{week.label}</p>
                        <ul className="fd-item__list">
                          {week.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                        <CopyButton text={week.items.map((item) => `• ${item}`).join("\n")} />
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </section>

          <div className="fd-footer-actions">
            <Link href={routes.draftRoom} className="fd-btn fd-btn--start">
              {footer.startNewCampaign}
            </Link>
            <Link href={routes.studioBoard} className="fd-btn fd-btn--return">
              {footer.returnToBoard} →
            </Link>
          </div>
        </>
      )}

      <StudioBoardDevStatus placement="sidebar" />
      </div>
    </UtilityPageFrame>
  );
}
