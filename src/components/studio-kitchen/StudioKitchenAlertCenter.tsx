import { studioKitchen, type KitchenAlert } from "@/config/studio-kitchen";

type Props = {
  alerts: KitchenAlert[];
};

export default function StudioKitchenAlertCenter({ alerts }: Props) {
  const { alerts: copy } = studioKitchen;

  return (
    <section className="sk-alerts utility-card" aria-labelledby="sk-alerts-title">
      <h2 id="sk-alerts-title" className="sk-alerts__title">
        <span className="sk-alerts__icon" aria-hidden="true">
          {copy.icon}
        </span>
        {copy.title}
      </h2>
      <ul className="sk-alerts__list">
        {alerts.map((alert) => (
          <li key={alert.id} className={`sk-alerts__item sk-alerts__item--${alert.tone}`}>
            {alert.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
