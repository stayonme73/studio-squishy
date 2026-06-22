import {
  kitchenDeliverableComplete,
  type KitchenCampaign,
} from "@/config/studio-kitchen";

type Props = {
  deliverables: KitchenCampaign["deliverables"];
  compact?: boolean;
};

export default function StudioKitchenDeliverablesCell({ deliverables, compact = false }: Props) {
  return (
    <ul className={`sk-deliverables ${compact ? "sk-deliverables--compact" : ""}`}>
      {deliverables.map((line) => {
        const done = kitchenDeliverableComplete(line);
        return (
          <li
            key={line.key}
            className={`sk-deliverables__line ${done ? "sk-deliverables__line--done" : "sk-deliverables__line--pending"}`}
          >
            <span className="sk-deliverables__key">{line.key}</span>
            <span className="sk-deliverables__count">
              {line.complete}/{line.total} Complete
            </span>
          </li>
        );
      })}
    </ul>
  );
}
