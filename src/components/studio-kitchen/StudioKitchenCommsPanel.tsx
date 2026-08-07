import { studioKitchenComms } from "@/config/studio-kitchen-comms-v1";
import type { KitchenCommsLedger, KitchenOperationalEvent } from "@/lib/studio-kitchen-comms";

type Props = {
  ledger: KitchenCommsLedger;
};

function recipientLabel(event: KitchenOperationalEvent): string {
  return event.recipients
    .map((recipient) => {
      if (recipient.kind === "production_role") return recipient.role;
      if (recipient.kind === "unassigned") return recipient.note;
      return recipient.kind;
    })
    .join(", ");
}

function EventList({
  title,
  events,
  empty,
}: {
  title: string;
  events: readonly KitchenOperationalEvent[];
  empty: string;
}) {
  return (
    <section className="utility-card" aria-label={title}>
      <h3>{title}</h3>
      {events.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <ul>
          {events.slice(0, 20).map((event) => (
            <li key={event.eventId} data-kitchen-comms-event={event.eventId}>
              <strong>{event.eventType}</strong> · {event.occurredAt}
              <br />
              {event.internalSummary}
              <br />
              Recipients: {recipientLabel(event)} · Owner: {event.ownerEscalation}
              {event.visibility === "internal_only" ? " · Internal only" : " · Customer-safe candidate"}
              {event.customerSafeSummary ? (
                <>
                  <br />
                  Customer-safe: {event.customerSafeSummary}
                </>
              ) : null}
              {event.uncertainty ? (
                <>
                  <br />
                  Uncertainty: {event.uncertainty}
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function StudioKitchenCommsPanel({ ledger }: Props) {
  const copy = studioKitchenComms;

  return (
    <div className="sk-comms" aria-label={copy.sectionTitle}>
      <section className="utility-card">
        <h2>{copy.sectionTitle}</h2>
        <p>{copy.sectionLead}</p>
        <p>
          Owner required: {ledger.ownerRequiredCount} · Role actions:{" "}
          {ledger.unresolvedRoleActionCount} · Awaiting transport:{" "}
          {ledger.awaitingTransportCount} · Owner authority unclear:{" "}
          {ledger.ownerAuthorityUnclearCount}
        </p>
      </section>
      <EventList
        title={copy.activeTitle}
        events={ledger.active}
        empty={copy.emptyActive}
      />
      <EventList
        title={copy.historyTitle}
        events={ledger.history}
        empty={copy.emptyHistory}
      />
    </div>
  );
}
