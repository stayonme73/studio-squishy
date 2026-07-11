import type { SquishyRouteMapMessage } from "@/lib/route-map-squishy";

type Props = {
  message: SquishyRouteMapMessage | null;
};

/** Presentational only — renders whatever RouteMapScene resolves. No message logic here. */
export default function RouteMapSquishyPanel({ message }: Props) {
  if (!message) return null;

  return (
    <div className="route-map-squishy" role="status" aria-live="polite">
      <span className="route-map-squishy__label">Squishy</span>
      <span className="route-map-squishy__text">{message.text}</span>
    </div>
  );
}
