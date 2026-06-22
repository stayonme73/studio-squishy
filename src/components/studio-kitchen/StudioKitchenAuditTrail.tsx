import { studioKitchen, type KitchenAuditEvent } from "@/config/studio-kitchen";

type Props = {
  events: KitchenAuditEvent[];
  title?: string;
  id?: string;
};

export default function StudioKitchenAuditTrail({ events, title, id = "sk-audit-title" }: Props) {
  const heading = title ?? studioKitchen.detail.auditTitle;
  const sorted = [...events].reverse();

  return (
    <section className="sk-audit utility-card" aria-labelledby={id}>
      <h2 id={id} className="sk-audit__title">
        {heading}
      </h2>

      {sorted.length === 0 ? (
        <p className="sk-audit__empty">No audit events recorded yet.</p>
      ) : (
        <ol className="sk-audit__list">
          {sorted.map((event, index) => (
            <li key={`${event.label}-${event.timestamp.date}-${index}`} className="sk-audit__item">
              <div className="sk-audit__event">
                <p className="sk-audit__label">{event.label}</p>
                <p className="sk-audit__responsible">{event.responsible}</p>
                <p className="sk-audit__date">{event.timestamp.date}</p>
                <p className="sk-audit__time">{event.timestamp.time}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
