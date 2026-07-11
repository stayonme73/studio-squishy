import SquishyStatusPanel from "@/components/squishy/SquishyStatusPanel";
import type { SquishyRouteMapMessage } from "@/lib/route-map-squishy";

type Props = {
  message: SquishyRouteMapMessage | null;
};

/** Route Map skin — delegates to shared panel without behavior change. */
export default function RouteMapSquishyPanel({ message }: Props) {
  return <SquishyStatusPanel message={message} classNamePrefix="route-map-squishy" />;
}
