"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { flushSync } from "react-dom";

import HomepageStudioVoice from "@/components/studio-homepage/HomepageStudioVoice";
import { usePinnedHomepageMast } from "@/components/studio-homepage/use-pinned-homepage-mast";

import {
  homepageAbout,
  homepageBrand,
  homepageContact,
  homepageDemo,
  homepageFaq,
  homepageFooter,
  homepageHero,
  homepageHowItWorks,
  homepageNavInformational,
  homepagePackages,
  homepageVoice,
  homepageWhatWeCreate,
  studioHomepageLobbyRebuildV1,
} from "@/config/studio-homepage-lobby-rebuild-v1";
import "./studio-homepage-lobby.css";

function AssuranceIcon({ name }: { name: "clock" | "people" | "check" }) {
  if (name === "clock") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "people") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16" cy="10" r="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.5 17.5c.6-2.2 2.4-3.5 4.5-3.5s3.9 1.3 4.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M14 14.2c1.4-.3 2.8.2 3.6 1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.2 12.2 2.4 2.4 5-5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PackageIcon({ name }: { name: "play" | "cut" | "image" | "check" | "stack" }) {
  if (name === "cut") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="6" cy="7" r="3" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="6" cy="17" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 8.5 20 18M9 15.5 20 6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === "image") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="8.5" cy="10" r="1.6" fill="currentColor" />
        <path d="m7 16 3.5-3.5L14 16l2-2 3 3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="m8 12.5 2.5 2.5 5.5-6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (name === "stack") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="7" y="7" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 16V6a1 1 0 0 1 1-1h10" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" />
    </svg>
  );
}

type HomepageWorkTile = (typeof homepageWhatWeCreate.items)[number];

/** Current tiles are previews. A tile plays only when it already carries all three fields. */
function readPlayableWorkTile(
  item: HomepageWorkTile,
): { src: string; poster: string; label: string } | null {
  if (
    !("playableSrc" in item) ||
    !("playablePoster" in item) ||
    !("playableLabel" in item)
  ) {
    return null;
  }
  const src = item.playableSrc;
  const poster = item.playablePoster;
  const label = item.playableLabel;
  if (typeof src !== "string" || typeof poster !== "string" || typeof label !== "string") {
    return null;
  }
  if (src.length === 0 || poster.length === 0 || label.length === 0) return null;
  return { src, poster, label };
}

function scrollToId(id: string) {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }
}

export default function StudioHomepageLobby() {
  const [menuOpen, setMenuOpen] = useState(false);
  usePinnedHomepageMast(menuOpen);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [studioVoiceOpen, setStudioVoiceOpen] = useState(false);
  const [demoEnded, setDemoEnded] = useState(false);
  const [player, setPlayer] = useState<{ src: string; poster: string; label: string }>({
    src: homepageDemo.src,
    poster: homepageDemo.poster,
    label: homepageDemo.playerLabel,
  });
  const showcaseRef = useRef<HTMLDivElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const scrollYRef = useRef(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const demoVideoRef = useRef<HTMLVideoElement>(null);
  const demoDialogRef = useRef<HTMLDivElement>(null);
  const allowBackdropCloseRef = useRef(false);
  const demoPlayerTitleId = useId();

  const scrollShowcase = useCallback((direction: -1 | 1) => {
    const node = showcaseRef.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tiles = [...node.querySelectorAll<HTMLElement>(".studio-homepage__tile")];
    const box = node.getBoundingClientRect();
    const currentIndex = tiles.findIndex(
      (tile) => tile.getBoundingClientRect().right > box.left + 8,
    );
    const target = tiles[currentIndex + direction];
    if (currentIndex < 0 || !target) return;
    const left = node.scrollLeft + (target.getBoundingClientRect().left - box.left);
    node.style.scrollSnapType = "none";
    node.scrollTo({
      left,
      behavior: reduced ? "auto" : "smooth",
    });
    window.setTimeout(() => {
      node.style.scrollSnapType = "";
    }, reduced ? 0 : 700);
  }, []);

  useEffect(() => {
    const onMove = (event: Event) => {
      const direction = (event as CustomEvent<{ direction?: number }>).detail?.direction;
      if (direction === 1 || direction === -1) scrollShowcase(direction);
    };
    window.addEventListener("studio-homepage-showcase", onMove);
    return () => window.removeEventListener("studio-homepage-showcase", onMove);
  }, [scrollShowcase]);

  const openHomepageStudioVoice = useCallback(() => {
    setStudioVoiceOpen(true);
  }, []);

  const closeDemoModal = useCallback(() => {
    const video = demoVideoRef.current;
    if (video) {
      video.pause();
    }
    setDemoEnded(false);
    setDemoModalOpen(false);
  }, []);

  const openDemoModal = useCallback(
    (
      opener: HTMLButtonElement | null,
      next: { src: string; poster: string; label: string } = {
        src: homepageDemo.src,
        poster: homepageDemo.poster,
        label: homepageDemo.playerLabel,
      },
    ) => {
      openerRef.current = opener;
      scrollYRef.current = window.scrollY;
      allowBackdropCloseRef.current = false;
      setDemoEnded(false);
      setPlayer(next);
      flushSync(() => {
        setDemoModalOpen(true);
      });
      const video = demoVideoRef.current;
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      window.setTimeout(() => {
        allowBackdropCloseRef.current = true;
      }, 400);
    },
    [],
  );

  const replayDemo = useCallback(() => {
    const video = demoVideoRef.current;
    if (!video) return;
    setDemoEnded(false);
    video.currentTime = 0;
    void video.play();
  }, []);

  useEffect(() => {
    if (!demoModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDemoModal();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = demoDialogRef.current;
      if (!dialog) return;
      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button, [href], video, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((node) => !node.hasAttribute("disabled"));
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
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      const y = scrollYRef.current;
      (openerRef.current ?? playButtonRef.current)?.focus({ preventScroll: true });
      window.scrollTo(0, y);
    };
  }, [closeDemoModal, demoModalOpen]);

  const onHashLink = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      const href = event.currentTarget.getAttribute("href");
      if (!href?.startsWith("#")) return;
      event.preventDefault();
      const id = href.slice(1);
      setMenuOpen(false);
      if (id === "top") {
        window.history.replaceState(null, "", "#top");
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
        return;
      }
      window.history.replaceState(null, "", href);
      scrollToId(id);
    },
    [],
  );

  return (
    <div className="studio-homepage" id="top" data-studio-homepage="page-1">
      <header
        className="studio-homepage__mast"
        data-open={menuOpen ? "true" : "false"}
      >
        <div className="studio-homepage__inner studio-homepage__mast-row">
          <span className="studio-homepage__brand">
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
          </span>
          <div
            id="homepage-section-nav"
            className="studio-homepage__links"
            role="navigation"
            aria-label="Homepage sections"
          >
            {homepageNavInformational.map((item) =>
              item.id === "home" ? (
                <span
                  key={item.id}
                  className="studio-homepage__text-link studio-homepage__text-current"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <a
                  key={item.id}
                  href={item.href}
                  className="studio-homepage__text-link"
                  onClick={onHashLink}
                >
                  {item.label}
                </a>
              ),
            )}
          </div>
          <div className="studio-homepage__actions">
            <button
              type="button"
              className="studio-homepage__btn-ghost studio-homepage__menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="homepage-section-nav"
              onClick={() => setMenuOpen((open) => !open)}
            >
              Menu
            </button>
            <button
              type="button"
              className="studio-homepage__btn-secondary studio-homepage__voice-entry"
              aria-label={homepageVoice.label}
              onClick={openHomepageStudioVoice}
            >
              {homepageVoice.label}
            </button>
            <Link
              href={studioHomepageLobbyRebuildV1.helpHref}
              className="studio-homepage__btn-secondary"
            >
              Help Center
            </Link>
            <Link
              href={studioHomepageLobbyRebuildV1.myStudioHref}
              className="studio-homepage__btn-secondary"
            >
              My Studio
            </Link>
          </div>
        </div>
      </header>
      <HomepageStudioVoice
        open={studioVoiceOpen}
        onClose={() => setStudioVoiceOpen(false)}
      />

      <section className="studio-homepage__hero-band">
        <div className="studio-homepage__inner studio-homepage__hero-grid">
          <div className="studio-homepage__hero-copy">
            <p className="studio-homepage__hero-kicker">
              <span aria-hidden="true">— </span>
              {homepageHero.eyebrow}
            </p>
            <h1 className="studio-homepage__hero-title" aria-label={homepageHero.headline}>
              {homepageHero.headlineLead}
              <br />
              {homepageHero.headlineBridge}{" "}
              <span className="studio-homepage__hero-accent">{homepageHero.headlineAccent}</span>
            </h1>
            <p className="studio-homepage__lead">{homepageHero.body}</p>
            <div className="studio-homepage__hero-actions">
              <a
                href={homepageHero.choosePackageHref}
                className="studio-homepage__btn-primary studio-homepage__choose"
                onClick={onHashLink}
              >
                {homepageHero.choosePackage}
                <span className="studio-homepage__choose-arrow" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </a>
              {homepageHero.showSeeOurWork ? (
                <a
                  href={homepageHero.seeWhatWeCreateHref}
                  className="studio-homepage__btn-secondary"
                  onClick={onHashLink}
                >
                  {homepageHero.seeWhatWeCreate}
                </a>
              ) : null}
            </div>
            <ul className="studio-homepage__assurances">
              {homepageHero.assurances.map((item) => (
                <li key={item.id} className="studio-homepage__assurance">
                  <span className="studio-homepage__assurance-icon">
                    <AssuranceIcon name={item.icon} />
                  </span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="studio-homepage__demo-wrap">
          <aside
            className="studio-homepage__demo"
            id="studio-demo"
            aria-label={homepageDemo.label}
          >
            <div className="studio-homepage__demo-stage">
              {homepageDemo.approved ? (
                <button
                  ref={playButtonRef}
                  type="button"
                  className="studio-homepage__demo-open"
                  aria-haspopup="dialog"
                  aria-expanded={demoModalOpen}
                  onClick={(event) => openDemoModal(event.currentTarget)}
                >
                  <img
                    className="studio-homepage__demo-poster"
                    src={homepageDemo.poster}
                    alt=""
                  />
                  <span className="studio-homepage__demo-open-label">
                    <span className="studio-homepage__play" aria-hidden="true">
                      <span />
                    </span>
                    <span>{homepageDemo.playLabel}</span>
                  </span>
                </button>
              ) : (
                <p className="studio-homepage__demo-status">{homepageDemo.preparingNote}</p>
              )}
            </div>
          </aside>
          <p className="studio-homepage__demo-caption">{homepageDemo.supportingLine}</p>
          </div>
        </div>
      </section>

      <section className="studio-homepage__section" id="our-work">
        <div className="studio-homepage__inner">
          <p className="studio-homepage__kicker">{homepageWhatWeCreate.eyebrow}</p>
          <div className="studio-homepage__section-head">
            <h2 className="studio-homepage__section-title">
              {homepageWhatWeCreate.headline}
            </h2>
            <div className="studio-homepage__carousel-nav">
              <button
                type="button"
                className="studio-homepage__carousel-btn"
                aria-label="Previous sample"
                onClick={() => scrollShowcase(-1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M19 12H5M11 6l-6 6 6 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="studio-homepage__carousel-btn"
                aria-label="Next sample"
                data-showcase-next=""
                onClick={() => scrollShowcase(1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
          <p className="studio-homepage__sample-note">{homepageWhatWeCreate.clarifier}</p>
          <div
            ref={showcaseRef}
            className="studio-homepage__showcase"
            aria-label="Sample work"
            onPointerDown={(event) => {
              const node = showcaseRef.current;
              if (!node) return;
              const target = event.target;
              if (target instanceof Element && target.closest(".studio-homepage__tile-open")) {
                return;
              }
              delete node.dataset.dragMoved;
              node.dataset.dragStartX = String(event.clientX);
              node.dataset.dragStartScroll = String(node.scrollLeft);
              node.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const node = showcaseRef.current;
              if (!node || node.dataset.dragStartX == null) return;
              const startX = Number(node.dataset.dragStartX);
              const startScroll = Number(node.dataset.dragStartScroll);
              if (Math.abs(event.clientX - startX) > 8) node.dataset.dragMoved = "1";
              node.scrollLeft = startScroll - (event.clientX - startX);
            }}
            onPointerUp={() => {
              const node = showcaseRef.current;
              if (!node) return;
              delete node.dataset.dragStartX;
              delete node.dataset.dragStartScroll;
            }}
          >
            {homepageWhatWeCreate.items.map((item) => {
              const playable = readPlayableWorkTile(item);
              return (
              <article key={item.id} className="studio-homepage__tile">
                <div className="studio-homepage__tile-art">
                  {"tilePreview" in item && item.tilePreview ? (
                    <img
                      src={item.tilePreview}
                      alt=""
                      className="studio-homepage__tile-preview"
                    />
                  ) : null}
                </div>
                <p>{item.label}</p>
                {playable ? (
                  <button
                    type="button"
                    className="studio-homepage__tile-open"
                    aria-haspopup="dialog"
                    aria-label={`Play ${playable.label}`}
                    onClick={(event) => {
                      const node = showcaseRef.current;
                      if (node?.dataset.dragMoved === "1") {
                        delete node.dataset.dragMoved;
                        return;
                      }
                      openDemoModal(event.currentTarget, playable);
                    }}
                  />
                ) : null}
              </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="studio-homepage__section" id="packages">
        <div className="studio-homepage__inner">
          <p className="studio-homepage__kicker">{homepagePackages.eyebrow}</p>
          <h2 className="studio-homepage__section-title">{homepagePackages.headline}</h2>
          <p className="studio-homepage__package-prompt">{homepagePackages.prompt}</p>
          <div className="studio-homepage__packages">
            {homepagePackages.items.map((item) => (
              <article
                key={item.id}
                className="studio-homepage__card"
                id={item.anchor}
                data-package-id={item.id}
              >
                <div className="studio-homepage__icon">
                  <PackageIcon name={item.icon} />
                </div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <Link
                  href={item.detailHref}
                  className="studio-homepage__card-link"
                  data-package-detail="page"
                  data-package-id={item.id}
                  aria-label={`${homepagePackages.viewDetails}: ${item.name}`}
                >
                  {homepagePackages.viewDetails}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="studio-homepage__section" id="how-it-works">
        <div className="studio-homepage__inner">
          <p className="studio-homepage__kicker">{homepageHowItWorks.eyebrow}</p>
          <h2 className="studio-homepage__section-title">{homepageHowItWorks.headline}</h2>
          <ol className="studio-homepage__steps">
            {homepageHowItWorks.steps.map((step, index) => (
              <li key={step.id} className="studio-homepage__step">
                <p className="studio-homepage__step-num">{index + 1}</p>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="studio-homepage__section" id="about">
        <div className="studio-homepage__inner">
          <article className="studio-homepage__about">
            <p className="studio-homepage__kicker">{homepageAbout.eyebrow}</p>
            <h2 className="studio-homepage__section-title">{homepageAbout.headline}</h2>
            {homepageAbout.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        </div>
      </section>

      <section className="studio-homepage__section" id="faq">
        <div className="studio-homepage__inner">
          <p className="studio-homepage__kicker">{homepageFaq.eyebrow}</p>
          <h2 className="studio-homepage__section-title">{homepageFaq.headline}</h2>
          <div className="studio-homepage__faq-list">
            {homepageFaq.items.map((item) => (
              <details
                key={item.id}
                className="studio-homepage__faq-item"
                open={openFaq === item.id}
                onToggle={(event) => {
                  if (event.currentTarget.open) setOpenFaq(item.id);
                  else if (openFaq === item.id) setOpenFaq(null);
                }}
              >
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="studio-homepage__section" id="contact">
        <div className="studio-homepage__inner">
          <p className="studio-homepage__kicker">{homepageContact.eyebrow}</p>
          <h2 className="studio-homepage__section-title">{homepageContact.headline}</h2>
          <div className="studio-homepage__support-paths">
              {homepageContact.paths.map((path) => {
                const body = (
                  <>
                    <h3>{path.title}</h3>
                    <p>{path.body}</p>
                  </>
                );
                if (path.id === "voice") {
                  return (
                    <button
                      key={path.id}
                      type="button"
                      className="studio-homepage__support-path studio-homepage__voice-entry"
                      onClick={openHomepageStudioVoice}
                    >
                      {body}
                    </button>
                  );
                }
                return (
                  <Link
                    key={path.id}
                    href={
                      path.id === "email"
                        ? studioHomepageLobbyRebuildV1.studioVoiceEmailHref
                        : studioHomepageLobbyRebuildV1.helpHref
                    }
                    className="studio-homepage__support-path"
                  >
                    {body}
                  </Link>
                );
              })}
            </div>
        </div>
      </section>

      <footer className="studio-homepage__footer">
        <div className="studio-homepage__inner">
          <p>{homepageFooter.brand}</p>
        </div>
      </footer>
      {demoModalOpen && homepageDemo.approved ? (
        <div
          className="studio-homepage__demo-modal"
          data-demo-modal="open"
          onClick={() => {
            if (!allowBackdropCloseRef.current) return;
            closeDemoModal();
          }}
        >
          <div
            ref={demoDialogRef}
            className="studio-homepage__demo-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={demoPlayerTitleId}
            onClick={(event) => event.stopPropagation()}
          >
            <p id={demoPlayerTitleId} className="studio-homepage__demo-sr">
              {player.label}
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              className="studio-homepage__demo-close"
              onClick={closeDemoModal}
            >
              <span aria-hidden="true">×</span>
              <span className="studio-homepage__demo-sr">{homepageDemo.closeLabel}</span>
            </button>
            <div className="studio-homepage__demo-player">
              <video
                ref={demoVideoRef}
                className="studio-homepage__demo-video"
                src={player.src}
                poster={player.poster}
                controls
                playsInline
                preload="metadata"
                onEnded={() => setDemoEnded(true)}
                onPlay={() => setDemoEnded(false)}
              />
              {demoEnded ? (
                <div className="studio-homepage__demo-ended">
                  <button
                    type="button"
                    className="studio-homepage__btn-primary"
                    onClick={replayDemo}
                  >
                    {homepageDemo.replayLabel}
                  </button>
                  <button
                    type="button"
                    className="studio-homepage__btn-secondary"
                    onClick={closeDemoModal}
                  >
                    {homepageDemo.closeLabel}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
