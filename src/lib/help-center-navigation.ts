import { helpCenter, type HelpCenterFrom } from "@/config/help-center";
import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";

/** Inbound return origin from `?from=` — not outbound Help Center link context. */
export function parseHelpCenterFromParam(value: string | null): HelpCenterFrom | null {
  if (
    value === "campaign-details" ||
    value === "studio-board" ||
    value === "payment" ||
    value === "route-map"
  ) {
    return value;
  }
  return null;
}

/**
 * Resolve Help Center Back navigation from inbound return origin.
 * Does not participate in `UtilityPageHeader.helpCenterFrom` (outbound emitter context).
 */
export function resolveHelpCenterBackHref(from: HelpCenterFrom | null): string {
  if (from === "campaign-details") {
    return helpCenter.routes.campaignDetails;
  }
  if (from === "payment" || from === "route-map") {
    return legacyRouteQuarantineV1.activeFrontDoor;
  }
  return helpCenter.routes.studioBoard;
}
