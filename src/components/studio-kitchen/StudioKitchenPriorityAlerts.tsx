import { studioKitchen } from "@/config/studio-kitchen";
import type { KitchenPriorityAlert } from "@/config/studio-kitchen-file-room";

type Props = {
  alerts: KitchenPriorityAlert[];
};

export default function StudioKitchenPriorityAlerts({ alerts }: Props) {
  const { alerts: copy } = studioKitchen;

  if (alerts.length === 0) {
    return (
      <section className="sk-priority-alerts utility-card sk-priority-alerts--clear" aria-labelledby="sk-priority-alerts-title">
        <h2 id="sk-priority-alerts-title" className="sk-priority-alerts__title">
          Kitchen Clear
        </h2>
        <p className="sk-priority-alerts__clear">No urgent items — file room is running smoothly.</p>
      </section>
    );
  }

  return (
    <section className="sk-priority-alerts utility-card" aria-labelledby="sk-priority-alerts-title">
      <h2 id="sk-priority-alerts-title" className="sk-priority-alerts__title">
        {copy.title}
      </h2>
      <ul className="sk-priority-alerts__list">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={`sk-priority-alerts__item sk-priority-alerts__item--${alert.level}`}
          >
            {alert.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
