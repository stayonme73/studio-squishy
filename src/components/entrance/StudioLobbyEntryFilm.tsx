"use client";

import Link from "next/link";
import {
  studioLobbyEntryV1,
  writeLobbyEntryChoice,
} from "@/config/studio-lobby-entry-v1";

export type LobbyEntrySessionState = "checking" | "signed-in" | "signed-out";

type Props = {
  sessionState: LobbyEntrySessionState;
  onClose: () => void;
  /** Instant unlock when JS attaches — storage + cookie still written for reload. */
  onBeginNew?: () => void;
  /** No-JS fallback; may carry `?studioPaymentSandbox=1` for local cert. */
  beginNewHref?: string;
};

/**
 * Frosted Lobby entry film — Design Approved v1.
 * Runtime UI only; does not alter locked Lobby plate art.
 *
 * CTAs stay real hrefs so Samsung/phone navigates when React handlers never
 * attach. When JS does attach, New unlocks in place (storage + cookie) without
 * a redirect blink; begin-new remains the no-JS fallback.
 */
export default function StudioLobbyEntryFilm({
  sessionState,
  onClose,
  onBeginNew,
  beginNewHref,
}: Props) {
  const { copy, routes } = studioLobbyEntryV1;
  const returning =
    sessionState === "signed-in" ? copy.returningSignedIn : copy.returningSignedOut;
  const returningHref =
    sessionState === "signed-in" ? routes.studioBoard : routes.signInFromBoard;

  return (
    <div className="lobby-entry-film" role="dialog" aria-modal="true" aria-labelledby="lobby-entry-brand">
      <div className="lobby-entry-film__scrim" aria-hidden />
      <div className="lobby-entry-film__panel">
        <button
          type="button"
          className="lobby-entry-film__close"
          onClick={onClose}
          aria-label={copy.closeFilmAria}
        >
          <span aria-hidden>×</span>
        </button>

        <header className="lobby-entry-film__header">
          <p className="lobby-entry-film__welcome">{copy.welcomeScript}</p>
          <h2 id="lobby-entry-brand" className="lobby-entry-film__brand">
            {copy.brand}
          </h2>
          <p className="lobby-entry-film__support">{copy.supportingLine}</p>
        </header>

        <div className="lobby-entry-film__choices">
          <div className="lobby-entry-film__choice">
            <div className="lobby-entry-film__icon" aria-hidden>
              <NewVisitorIcon />
            </div>
            <h3 className="lobby-entry-film__choice-title">{copy.newToStudio.title}</h3>
            <p className="lobby-entry-film__choice-desc">{copy.newToStudio.description}</p>
            <a
              href={beginNewHref ?? routes.beginNew}
              className="lobby-entry-film__cta"
              onClick={(event) => {
                writeLobbyEntryChoice("new-to-studio");
                if (onBeginNew) {
                  event.preventDefault();
                  onBeginNew();
                }
              }}
            >
              <span>{copy.newToStudio.cta}</span>
              <span aria-hidden>→</span>
            </a>
          </div>

          <div className="lobby-entry-film__divider" aria-hidden>
            <span className="lobby-entry-film__or">{copy.orLabel}</span>
          </div>

          <div className="lobby-entry-film__choice">
            <div className="lobby-entry-film__icon" aria-hidden>
              <ReturningIcon />
            </div>
            <h3 className="lobby-entry-film__choice-title">{returning.title}</h3>
            <p className="lobby-entry-film__choice-desc">{returning.description}</p>
            <a href={returningHref} className="lobby-entry-film__cta">
              <span>{returning.cta}</span>
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>

        <footer className="lobby-entry-film__help">
          <p className="lobby-entry-film__help-prompt">
            <span className="lobby-entry-film__help-mark" aria-hidden>
              ?
            </span>
            {copy.help.prompt}
          </p>
          <Link href={routes.helpCenter} className="lobby-entry-film__help-link">
            {copy.help.cta}
            <span aria-hidden>↗</span>
          </Link>
        </footer>
      </div>

      <p className="lobby-entry-film__footer">{copy.footer}</p>
    </div>
  );
}

function NewVisitorIcon() {
  return (
    <svg viewBox="0 0 48 48" width="28" height="28" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="24" cy="18" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 36c2.5-5 7-8 12-8s9.5 3 12 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M36 14v8M32 18h8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReturningIcon() {
  return (
    <svg viewBox="0 0 48 48" width="28" height="28" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="24" cy="18" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 36c2.5-5 7-8 12-8s9.5 3 12 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
