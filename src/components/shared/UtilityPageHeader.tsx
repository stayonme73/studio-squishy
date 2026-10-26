import Link from "next/link";
import type { ReactNode } from "react";

import { helpCenterHref } from "@/config/help-center";
import { studioBoard } from "@/config/studio-board";
import { utilityPageUsesSecondaryNav } from "@/config/studio-utility-standards";
import type { UtilityNavId } from "@/config/utility-shell";
import {
  resolveHelpCenterOriginForUtilityNav,
  resolveHelpCenterProtectedAriaLabel,
  resolveHelpCenterProtectedHref,
} from "@/lib/help-center-navigation";

import UtilityNav from "./UtilityNav";

type Props = {
  backHref: string;
  activeNav: UtilityNavId;
  title: string;
  lead?: string;
  leadLines?: readonly string[];
  aside?: ReactNode;
  helpCenterFrom?: "campaign-details" | "studio-board" | "payment";
  /** Override default "← Back" label. */
  backLabel?: string;
  /** Text link instead of rounded secondary button. */
  backVariant?: "button" | "link";
  /** Override default Help Center link label. */
  helpLabel?: string;
  /** Stacked nav row + title block (Project Summary orientation strip). */
  layout?: "default" | "orientation";
  /** Help Center public surface passes the session probe. Authenticated rooms omit this. */
  signedIn?: boolean;
};

/** Approved utility top bar: Back | Title | Help Center (default) or orientation strip. */
export default function UtilityPageHeader({
  backHref,
  activeNav,
  title,
  lead,
  leadLines,
  aside,
  helpCenterFrom,
  backLabel,
  backVariant = "link",
  helpLabel,
  layout = "default",
  signedIn = true,
}: Props) {
  const showSecondaryNav = utilityPageUsesSecondaryNav(activeNav);
  const onHelpCenter = activeNav === "help-center";
  const resolvedBackHref = resolveHelpCenterProtectedHref(backHref, signedIn);
  const helpOrigin = resolveHelpCenterOriginForUtilityNav(activeNav, helpCenterFrom);
  const isOrientation = layout === "orientation";
  const backClassName =
    backVariant === "link"
      ? "utility-topbar__back utility-topbar__back--link"
      : "utility-btn utility-btn--secondary utility-topbar__back";
  const leadCopy =
    leadLines && leadLines.length > 0
      ? leadLines.map((line) => (
          <p key={line} className="utility-lead">
            {line}
          </p>
        ))
      : lead
        ? (
            <p className="utility-lead">{lead}</p>
          )
        : null;

  const backLink = (
    <Link
      href={resolvedBackHref}
      className={backClassName}
      aria-label={
        onHelpCenter
          ? resolveHelpCenterProtectedAriaLabel(backLabel ?? "Back", backHref, signedIn, "return")
          : undefined
      }
    >
      {backLabel ?? "← Back"}
    </Link>
  );

  const helpLink = onHelpCenter ? (
    <Link
      href={resolveHelpCenterProtectedHref(studioBoard.routes.studioBoard, signedIn)}
      className="utility-topbar__help"
      aria-label={resolveHelpCenterProtectedAriaLabel(
        "Studio Board",
        studioBoard.routes.studioBoard,
        signedIn,
      )}
    >
      Studio Board →
    </Link>
  ) : (
    <Link href={helpCenterHref(undefined, helpOrigin ?? helpCenterFrom)} className="utility-topbar__help">
      {helpLabel ?? "Help Center →"}
    </Link>
  );

  if (isOrientation) {
    return (
      <header className="utility-header">
        <div className="utility-topbar utility-topbar--orientation">
          <nav className="utility-topbar__nav" aria-label="Page navigation">
            {backLink}
            {showSecondaryNav ? null : helpLink}
          </nav>
          <div className="utility-topbar__intro">
            <h1 className="utility-topbar__title">{title}</h1>
            {leadCopy}
          </div>
        </div>

        {showSecondaryNav ? (
          <div className="utility-subnav">
            <UtilityNav activeId={activeNav} signedIn={signedIn} />
          </div>
        ) : null}

        {aside ? (
          <div className="utility-header__meta">
            <div className="utility-header__aside">{aside}</div>
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className="utility-header">
      <div className="utility-topbar">
        <div className="utility-topbar__start">
          {backLink}
        </div>
        <h1 className="utility-topbar__title">{title}</h1>
        {showSecondaryNav ? null : (
          <div className="utility-topbar__end">{helpLink}</div>
        )}
      </div>

      {showSecondaryNav ? (
        <div className="utility-subnav">
          <UtilityNav activeId={activeNav} signedIn={signedIn} />
        </div>
      ) : null}

      {leadCopy || aside ? (
        <div className="utility-header__meta">
          <div className="utility-header__copy">{leadCopy}</div>
          {aside ? <div className="utility-header__aside">{aside}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
