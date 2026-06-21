"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { studioBoard, type CampaignStatus } from "@/config/studio-board";
import type { MembershipSnapshotView } from "@/lib/studio-board-view";

const { whatHappensNextCopy } = studioBoard;

type WidgetId = "inspiration" | "membership" | "next";

type Props = {
  membership: MembershipSnapshotView;
  whatHappensNextSentence: string;
  philosophyQuote: readonly string[];
  hasCampaign: boolean;
  status: CampaignStatus | null;
};

function WidgetArrow({ direction, label, onClick }: { direction: "prev" | "next"; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`sb-widget-carousel__arrow sb-widget-carousel__arrow--${direction}`}
      aria-label={label}
      onClick={onClick}
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}

function InspirationCard({ quote }: { quote: readonly string[] }) {
  return (
    <div className="sb-widget-carousel__card sb-widget-carousel__card--inspiration bf-material bf-material-cork">
      <p className="sb-widget-carousel__label">{whatHappensNextCopy.philosophyLabel}</p>
      <p className="sb-widget-carousel__quote">
        {quote.map((line, index) => (
          <span key={`${line}-${index}`}>
            {line}
            {index < quote.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    </div>
  );
}

function MembershipCard({ membership }: { membership: MembershipSnapshotView }) {
  return (
    <div className="sb-widget-carousel__card sb-widget-carousel__card--membership">
      <p className="sb-widget-carousel__label">Membership Snapshot</p>
      {membership.isActive ? (
        <dl className="sb-widget-carousel__stats">
          <div className="sb-widget-carousel__stat">
            <dt>Campaigns Remaining</dt>
            <dd>{membership.campaignsRemaining} left</dd>
          </div>
          <div className="sb-widget-carousel__stat">
            <dt>Emails Remaining</dt>
            <dd>{membership.emailsRemaining} left</dd>
          </div>
          <div className="sb-widget-carousel__stat">
            <dt>SMS Remaining</dt>
            <dd>{membership.smsRemaining} left</dd>
          </div>
          <div className="sb-widget-carousel__stat">
            <dt>Renewal Date</dt>
            <dd>{membership.renewalDate}</dd>
          </div>
        </dl>
      ) : (
        <p className="sb-widget-carousel__empty">{membership.emptyHint}</p>
      )}
    </div>
  );
}

function NextCard({ sentence }: { sentence: string }) {
  return (
    <div className="sb-widget-carousel__card sb-widget-carousel__card--next">
      <p className="sb-widget-carousel__label">What Happens Next</p>
      <p className="sb-widget-carousel__sentence">{sentence}</p>
    </div>
  );
}

/** Single footprint — Inspiration, Membership, What Happens Next rotate via arrows. */
export default function SmartWidgetCarousel({
  membership,
  whatHappensNextSentence,
  philosophyQuote,
}: Props) {
  const widgets = useMemo(
    () =>
      [
        { id: "inspiration" as const, label: "Today's Inspiration" },
        { id: "membership" as const, label: "Membership Snapshot" },
        { id: "next" as const, label: "What Happens Next" },
      ] satisfies { id: WidgetId; label: string }[],
    [],
  );

  const [index, setIndex] = useState(0);
  const current = widgets[index] ?? widgets[0];

  useEffect(() => {
    setIndex(0);
  }, [whatHappensNextSentence, philosophyQuote]);

  const panels: Record<WidgetId, ReactNode> = {
    inspiration: <InspirationCard quote={philosophyQuote} />,
    membership: <MembershipCard membership={membership} />,
    next: <NextCard sentence={whatHappensNextSentence} />,
  };

  return (
    <section className="sb-widget-carousel" aria-label="Smart Studio Widget">
      <div className="sb-widget-carousel__chrome">
        <WidgetArrow
          direction="prev"
          label="Previous widget"
          onClick={() => setIndex((value) => (value - 1 + widgets.length) % widgets.length)}
        />
        <div className="sb-widget-carousel__viewport">
          <p className="sb-widget-carousel__active-label">{current.label}</p>
          {panels[current.id]}
        </div>
        <WidgetArrow
          direction="next"
          label="Next widget"
          onClick={() => setIndex((value) => (value + 1) % widgets.length)}
        />
      </div>
      <div className="sb-widget-carousel__dots" role="tablist" aria-label="Widget pages">
        {widgets.map((widget, dotIndex) => (
          <button
            key={widget.id}
            type="button"
            role="tab"
            aria-selected={dotIndex === index}
            aria-label={widget.label}
            className={`sb-widget-carousel__dot${dotIndex === index ? " sb-widget-carousel__dot--active" : ""}`}
            onClick={() => setIndex(dotIndex)}
          />
        ))}
      </div>
    </section>
  );
}
