import Link from "next/link";

import FileRoomIncidentCommandOwnerActions from "@/components/file-room/FileRoomIncidentCommandOwnerActions";
import {
  INCIDENT_COMMAND_ROUTE,
  type IncidentCommandDetail,
} from "@/lib/studio-work-supervision/view-model";

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

type Props = {
  detail: IncidentCommandDetail;
};

export default function FileRoomIncidentCommandDetailScene({ detail }: Props) {
  const { incident } = detail;
  const critical = detail.presentation === "critical";

  return (
    <div
      className={`fr-incident-command fr-incident-command__detail${
        critical ? " fr-incident-command--critical" : ""
      }`}
    >
      <p className="fr-header__meta">
        <Link href={INCIDENT_COMMAND_ROUTE}>← Incident Command</Link>
      </p>
      <p className="fr-incident-command__eyebrow">
        {incident.severity} · {incident.state}
        {incident.ownerEscalated ? " · Owner escalation" : ""}
      </p>
      <h2 className="fr-header__title">
        {incident.customerLabel} · {incident.incidentId}
      </h2>
      <p className="fr-lead">
        Project {incident.projectId}. Campaign {incident.campaignId}.
      </p>

      {critical ? (
        <p className="fr-incident-command__security-banner">
          Suspected or confirmed security path. This is not a confirmed breach unless evidence
          says so. Watchkeeper is not shown.
        </p>
      ) : detail.showSquishy ? (
        <div className="fr-incident-command__watchkeeper utility-card">
          <div className="fr-watchkeeper fr-watchkeeper--green">
            <span className="fr-watchkeeper__ring" aria-hidden="true" />
            <img
              className="fr-watchkeeper__portrait"
              src="/squishy/squishy-studio-guide-v1.png"
              alt=""
            />
          </div>
          <p className="fr-incident-command__caption">
            Routine internal Watchkeeper. This is not Studio Voice.
          </p>
        </div>
      ) : null}

      <dl className="fr-incident-command__dl utility-card">
        <div>
          <dt>Customer and project</dt>
          <dd>
            {incident.customerLabel} ({incident.customerId}). Project {incident.projectId}. Campaign{" "}
            {incident.campaignId}.
          </dd>
        </div>
        <div>
          <dt>Severity</dt>
          <dd>{incident.severity}</dd>
        </div>
        <div>
          <dt>What happened</dt>
          <dd>{detail.whatHappened}</dd>
        </div>
        <div>
          <dt>Who or what stalled or failed</dt>
          <dd>{detail.whoOrWhatStalled}</dd>
        </div>
        <div>
          <dt>Evidence-supported cause</dt>
          <dd>{detail.evidenceSupportedCause}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{formatWhen(incident.startedAt)}</dd>
        </div>
        <div>
          <dt>Last healthy</dt>
          <dd>{formatWhen(incident.lastHealthyAt)}</dd>
        </div>
        <div>
          <dt>Last heartbeat</dt>
          <dd>{formatWhen(incident.lastHeartbeatAt)}</dd>
        </div>
        <div>
          <dt>Current impact</dt>
          <dd>
            Customer: {incident.customerImpact} Deadline: {incident.deadlineImpact} Financial:{" "}
            {incident.financialImpact} Rights/compliance: {incident.rightsOrComplianceImpact}{" "}
            Security: {incident.securityOrBreachImpact}
          </dd>
        </div>
        <div>
          <dt>Containment</dt>
          <dd>{incident.containmentPerformed}</dd>
        </div>
        <div>
          <dt>Recovery attempts</dt>
          <dd>
            {incident.recoveryAttempts.length === 0 ? (
              "None yet."
            ) : (
              <ul>
                {incident.recoveryAttempts.map((attempt) => (
                  <li key={attempt.attemptId}>
                    {formatWhen(attempt.at)} · {attempt.strategy} · {attempt.result} ·{" "}
                    {attempt.detail}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt>Responsible party</dt>
          <dd>{incident.currentResponsibleParty}</dd>
        </div>
        <div>
          <dt>Who should be contacted</dt>
          <dd>{incident.whoMustBeContacted}</dd>
        </div>
        <div>
          <dt>Exact Owner decision or action</dt>
          <dd>{incident.ownerDecisionRequired}</dd>
        </div>
        <div>
          <dt>If Owner does nothing</dt>
          <dd>{incident.ifOwnerDoesNothing}</dd>
        </div>
        <div>
          <dt>Next automatic action</dt>
          <dd>{incident.nextAutomaticAction}</dd>
        </div>
        <div>
          <dt>Next check time</dt>
          <dd>{formatWhen(incident.nextCheckAt)}</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>
            {incident.evidence.length === 0 ? (
              "No evidence pointers yet."
            ) : (
              <ul>
                {incident.evidence.map((item) => (
                  <li key={item.id}>
                    {item.kind}: {item.summary} ({formatWhen(item.recordedAt)})
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt>Append-only history</dt>
          <dd>
            <ol className="fr-incident-command__history">
              {incident.history.map((event) => (
                <li key={event.eventId}>
                  {formatWhen(event.at)} · {event.actor} · {event.type} · {event.summary}
                </li>
              ))}
            </ol>
          </dd>
        </div>
      </dl>

      {detail.ownerControlsAuthorized ? (
        <FileRoomIncidentCommandOwnerActions incidentId={incident.incidentId} />
      ) : (
        <p className="fr-incident-command__hint">
          Owner controls are not authorized on this record. Routine recovery stays with the
          Machine, or the record is already resolved.
        </p>
      )}
    </div>
  );
}
