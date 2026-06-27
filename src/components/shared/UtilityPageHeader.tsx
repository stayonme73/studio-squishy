import Link from "next/link";
import type { ReactNode } from "react";

import { helpCenterHref } from "@/config/help-center";
import { studioBoard } from "@/config/studio-board";
import { utilityPageUsesSecondaryNav } from "@/config/studio-utility-standards";
import type { UtilityNavId } from "@/config/utility-shell";

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
  backVariant = "button",
  helpLabel,
  layout = "default",
}: Props) {
  const showSecondaryNav = utilityPageUsesSecondaryNav(activeNav);
  const onHelpCenter = activeNav === "help-center";
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
    <Link href={backHref} className={backClassName}>
      {backLabel ?? "← Back"}
    </Link>
  );

  const helpLink = onHelpCenter ? (
    <Link href={studioBoard.routes.studioBoard} className="utility-topbar__help">
      Studio Board →
    </Link>
  ) : (
    <Link href={helpCenterHref(undefined, helpCenterFrom)} className="utility-topbar__help">
      {helpLabel ?? "Help Center →"}
    </Link>
  );

  if (isOrientation) {
    return (
      <header className="utility-header">
        <div className="utility-topbar utility-topbar--orientation">
          <nav className="utility-topbar__nav" aria-label="Page navigation">
            {backLink}
            {helpLink}
          </nav>
          <div className="utility-topbar__intro">
            <h1 className="utility-topbar__title">{title}</h1>
            {leadCopy}
          </div>
        </div>

        {showSecondaryNav ? (
          <div className="utility-subnav">
            <UtilityNav activeId={activeNav} />
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
        <div className="utility-topbar__end">
          {helpLink}
        </div>
      </div>

      {showSecondaryNav ? (
        <div className="utility-subnav">
          <UtilityNav activeId={activeNav} />
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
