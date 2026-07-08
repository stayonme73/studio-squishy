import Link from "next/link";

import {
  resolveAccessDeniedCopy,
  type AccessControlDeniedRoomId,
} from "@/config/access-control";

type Props = {
  room?: AccessControlDeniedRoomId;
  /** Full utility page shell, or card-only for embedded internal layouts. */
  layout?: "page" | "card";
  titleId?: string;
};

export function AccessControlDeniedCard({
  room = "customer",
  titleId = "access-denied-title",
}: Pick<Props, "room" | "titleId">) {
  const content = resolveAccessDeniedCopy(room);

  return (
    <section className="utility-card" aria-labelledby={titleId}>
      <p className="utility-eyebrow">{content.eyebrow}</p>
      <h1 id={titleId} className="utility-title">
        {content.title}
      </h1>
      <p className="utility-lead">{content.message}</p>
      {content.note ? <p className="utility-note">{content.note}</p> : null}
      <div className="utility-access-actions">
        <Link href={content.primaryHref} className="utility-btn utility-btn--primary">
          {content.primaryCta}
        </Link>
        <Link href={content.secondaryHref} className="utility-btn utility-btn--secondary">
          {content.secondaryCta}
        </Link>
      </div>
    </section>
  );
}

/** Reusable Access Denied card — customer-facing and internal rooms share layout. */
export default function AccessControlDeniedPanel({
  room = "customer",
  layout = "page",
  titleId = "access-denied-title",
}: Props) {
  const card = <AccessControlDeniedCard room={room} titleId={titleId} />;

  if (layout === "card") {
    return card;
  }

  return (
    <div className="utility-page utility-page--access">
      <div className="utility-access-card-shell">{card}</div>
    </div>
  );
}
