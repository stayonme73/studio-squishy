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
};

/** Approved utility top bar: Back | Title | Help Center. */
export default function UtilityPageHeader({
  backHref,
  activeNav,
  title,
  lead,
  leadLines,
  aside,
  helpCenterFrom,
}: Props) {
  const showSecondaryNav = utilityPageUsesSecondaryNav(activeNav);
  const onHelpCenter = activeNav === "help-center";
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

  return (
    <header className="utility-header">
      <div className="utility-topbar">
        <div className="utility-topbar__start">
          <Link href={backHref} className="utility-btn utility-btn--secondary utility-topbar__back">
            ← Back
          </Link>
        </div>
        <h1 className="utility-topbar__title">{title}</h1>
        <div className="utility-topbar__end">
          {onHelpCenter ? (
            <Link href={studioBoard.routes.studioBoard} className="utility-topbar__help">
              Studio Board →
            </Link>
          ) : (
            <Link href={helpCenterHref(undefined, helpCenterFrom)} className="utility-topbar__help">
              Help Center →
            </Link>
          )}
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
