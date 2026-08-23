import Link from "next/link";

import type { IncidentCommandView } from "@/lib/studio-work-supervision/view-model";

type Props = {
  view: IncidentCommandView;
};

export default function FileRoomIncidentCommandScene({ view }: Props) {
  const securityBoard = view.watchkeeper.ring === "hidden";

  return (
    <div
      className={`fr-incident-command${securityBoard ? " fr-incident-command--critical" : ""}`}
    >
      <h2 className="fr-header__title">{view.title}</h2>
      <p className="fr-lead">{view.lead}</p>
      <p className="fr-incident-command__fixture-note">
        This board is seeded with fictional Maple & Pine Books and Harbor Lantern Co. fixture
        records. It is not live customer work.
      </p>

      <section className="fr-incident-command__watchkeeper utility-card">
        {view.watchkeeper.showSquishy ? (
          <div className={`fr-watchkeeper fr-watchkeeper--${view.watchkeeper.ring}`}>
            <span className="fr-watchkeeper__ring" aria-hidden="true" />
            {/* Canonical Watchkeeper asset only. Do not swap or regenerate. */}
            <img
              className="fr-watchkeeper__portrait"
              src={view.watchkeeper.assetSrc}
              alt=""
            />
          </div>
        ) : (
          <p className="fr-incident-command__security-banner">
            Security path. Watchkeeper is hidden. This layout is direct and not playful.
          </p>
        )}
        <p className="fr-incident-command__caption">{view.watchkeeper.caption}</p>
      </section>

      <section className="utility-card">
        <h3 className="fr-section-title">Provider ports</h3>
        <ul className="fr-incident-command__providers">
          {view.providers.map((port) => (
            <li key={port.id}>
              <strong>{port.label}</strong>
              {" — "}
              {port.status}
              {port.healthyDisplayAllowed ? null : " · healthy display not allowed"}
            </li>
          ))}
        </ul>
      </section>

      <section className="utility-card">
        <h3 className="fr-section-title">Healthy leases</h3>
        {view.healthyLeases.length === 0 ? (
          <p>No healthy leases are on this board.</p>
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
      </section>

      <section>
        <h3 className="fr-section-title">Incident records</h3>
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
      </section>
    </div>
  );
}
