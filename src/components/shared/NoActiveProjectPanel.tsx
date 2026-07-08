import Link from "next/link";

import type { NoActiveProjectCopy } from "@/config/access-control";

type Props = {
  copy: NoActiveProjectCopy;
  titleId?: string;
};

/** Reusable No Active Project card — room-specific copy, shared layout. */
export default function NoActiveProjectPanel({ copy, titleId = "no-active-project-title" }: Props) {
  return (
    <div className="utility-page utility-page--access">
      <div className="utility-access-card-shell">
        <section className="utility-card" aria-labelledby={titleId}>
          <p className="utility-eyebrow">{copy.eyebrow}</p>
          <h1 id={titleId} className="utility-title">
            {copy.title}
          </h1>
          <p className="utility-lead">{copy.message}</p>
          {copy.messageSecondary ? <p className="utility-lead">{copy.messageSecondary}</p> : null}
          <div className="utility-access-actions">
            <Link href={copy.primaryHref} className="utility-btn utility-btn--primary">
              {copy.primaryCta}
            </Link>
            <Link href={copy.secondaryHref} className="utility-btn utility-btn--secondary">
              {copy.secondaryCta}
            </Link>
          </div>
          {copy.footnote ? <p className="utility-note">{copy.footnote}</p> : null}
        </section>
      </div>
    </div>
  );
}
