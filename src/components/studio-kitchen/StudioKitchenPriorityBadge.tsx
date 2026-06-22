import type { KitchenCampaign, KitchenPriority } from "@/config/studio-kitchen";

const priorityClass: Record<KitchenPriority, string> = {
  Normal: "sk-priority--normal",
  Rush: "sk-priority--rush",
  Waiting: "sk-priority--waiting",
  "Client Delayed": "sk-priority--client-delayed",
  Overdue: "sk-priority--overdue",
};

type Props = {
  priority: KitchenPriority;
};

export default function StudioKitchenPriorityBadge({ priority }: Props) {
  return (
    <span className={`sk-priority ${priorityClass[priority]}`}>{priority}</span>
  );
}
