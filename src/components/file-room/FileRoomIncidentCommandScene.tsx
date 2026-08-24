import Link from "next/link";

import type { LiveReadResult } from "@/lib/studio-work-supervision/live-read";
import { sanitizedLiveStatusPane } from "@/lib/studio-work-supervision/live-read";
import type { IncidentCommandView } from "@/lib/studio-work-supervision/view-model";

type Props = {
  fixture: IncidentCommandView;
  live: IncidentCommandView | null;
  liveRead: LiveReadResult;
};

function RecordSection({ view }: { view: IncidentCommandView }) {
  return (
    <section className="utility-card">
      <h3 className="fr-section-title">
        {view.recordSource === "live" ? "Persisted live records" : "Fictional fixtures"}
      </h3>
      <p className="fr-incident-command__fixture-note">{view.sourceLabel}</p>
      <h4 className="fr-section-title">Healthy leases</h4>
      {view.healthyLeases.length === 0 ? (
        <p>No healthy leases are in this set.</p>
      ) : (
        <ul className="fr-incident-command__leases">
          {view.healthyLeases.map((lease) => (
            <li key={lease.leaseId}>
              {lease.subject.label} · {lease.kind} · {lease.health} · {lease.customerLabel} ·{" "}
              {lease.step}
            </li>
          ))}
        </ul>
      )}
      <h4 className="fr-section-title">Incident records</h4>
      {view.incidentCards.length === 0 ? (
        <p>No incident records are in this set.</p>
      ) : (
        <div className="fr-incident-command__grid">
          {view.incidentCards.map((card) => (
            <article
              key={card.incidentId}
              className={`fr-incident-command__card utility-card${
                card.severity === "SECURITY_SUSPECTED" || card.severity === "SECURITY_CONFIRMED"
                  ? " fr-incident-command__card--critical"
                  : ""
              }`}
            >
              <p className="fr-incident-command__eyebrow">
                {card.severity} · {card.state}
                {card.ownerEscalated ? " · Owner escalation" : ""}
                {view.recordSource === "live" ? " · persisted" : " · fixture"}
              </p>
              <h4 className="fr-incident-command__card-title">{card.customerLabel}</h4>
              <p>
                Project {card.projectId} · Campaign {card.campaignId}
              </p>
              <p>
                <strong>What happened:</strong> {card.whatHappened}
              </p>
              <p>
                <strong>Who or what stalled:</strong> {card.whoOrWhatStalled}
              </p>
              {card.showSquishy ? (
                <p className="fr-incident-command__hint">Routine internal record.</p>
              ) : (
                <p className="fr-incident-command__hint">Watchkeeper is not used on this record.</p>
              )}
              <p>
                <Link href={card.href}>Open incident {card.incidentId}</Link>
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function FileRoomIncidentCommandLiveStatus({
  liveRead,
  variant = "page",
}: {
  liveRead: LiveReadResult;
  variant?: "page" | "detail";
}) {
  const pane = sanitizedLiveStatusPane(liveRead, variant);
  const closed = !liveRead.ok;
  return (
    <section
      className={`fr-incident-command__live-status utility-card${
        closed ? " fr-incident-command__live-status--closed" : ""
      }`}
      data-live-init-stage={pane.stage}
      data-live-error-class={pane.errorClass ?? "none"}
      data-live-schema-version={pane.schemaVersion ?? "withheld"}
    >
      <h3 className="fr-section-title">{pane.title}</h3>
      <p className={closed ? "fr-incident-command__error" : "fr-incident-command__fixture-note"}>
        {pane.body}
      </p>
    </section>
  );
}

export default function FileRoomIncidentCommandScene({ fixture, live, liveRead }: Props) {
  const securityBoard =
    fixture.watchkeeper.ring === "hidden" || live?.watchkeeper.ring === "hidden";
  const watchkeeper = securityBoard
    ? fixture.watchkeeper
    : !live || live.watchkeeper.ring === "green"
      ? fixture.watchkeeper
      : live.watchkeeper;

  return (
    <div
      className={`fr-incident-command${securityBoard ? " fr-incident-command--critical" : ""}`}
    >
      <h2 className="fr-header__title">{fixture.title}</h2>
      <p className="fr-lead">{fixture.lead}</p>
      <p className="fr-incident-command__fixture-note">
        Fixture records and persisted live records are shown in separate sets. They are never mixed.
        No real customer data is on this board.
      </p>

      <FileRoomIncidentCommandLiveStatus liveRead={liveRead} />

      <section className="fr-incident-command__watchkeeper utility-card">
        {securityBoard ? (
          <p className="fr-incident-command__security-banner">
            Security path. Watchkeeper is hidden. This layout is direct and not playful.
          </p>
        ) : watchkeeper.showSquishy ? (
          <div className={`fr-watchkeeper fr-watchkeeper--${watchkeeper.ring}`}>
            <span className="fr-watchkeeper__ring" aria-hidden="true" />
            <img
              className="fr-watchkeeper__portrait"
              src={watchkeeper.assetSrc}
              alt=""
            />
          </div>
        ) : (
          <p className="fr-incident-command__security-banner">
            Security path. Watchkeeper is hidden. This layout is direct and not playful.
          </p>
        )}
        <p className="fr-incident-command__caption">
          {securityBoard
            ? "Security path is active. Watchkeeper is hidden. Use the critical records below."
            : watchkeeper.caption}
        </p>
      </section>

      <section className="utility-card">
        <h3 className="fr-section-title">Provider ports</h3>
        <ul className="fr-incident-command__providers">
          {fixture.providers.map((port) => (
            <li key={port.id}>
              <strong>{port.label}</strong>
              {" — "}
              {port.status}
              {port.healthyDisplayAllowed ? null : " · healthy display not allowed"}
            </li>
          ))}
        </ul>
      </section>

      <RecordSection view={fixture} />
      {live ? <RecordSection view={live} /> : null}
    </div>
  );
}
