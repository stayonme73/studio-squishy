import Link from "next/link";
import type { ReactNode } from "react";

import { studioKitchen } from "@/config/studio-kitchen";

type Props = {
  title?: string;
  backHref: string;
  backLabel: string;
  lead?: string;
  aside?: ReactNode;
};

export default function StudioKitchenHeader({ title, backHref, backLabel, lead, aside }: Props) {
  const { page } = studioKitchen;

  return (
    <header className="sk-header utility-header">
      <div className="utility-topbar sk-topbar">
        <div className="utility-topbar__start">
          <Link href={backHref} className="utility-btn utility-btn--secondary utility-topbar__back">
            {backLabel}
          </Link>
        </div>
        <h1 className="utility-topbar__title sk-topbar__title">{title ?? page.title}</h1>
        <div className="utility-topbar__end">
          <span className="sk-owner-badge">{page.eyebrow}</span>
        </div>
      </div>

      {lead || aside ? (
        <div className="sk-intro">
          {lead ? <p className="sk-intro__lead">{lead}</p> : null}
          {aside}
        </div>
      ) : null}
    </header>
  );
}
