import {
  helpCenter,
  isHelpCenterFrom,
  type HelpCenterFrom,
} from "@/config/help-center";
import { studioBoard } from "@/config/studio-board";
import type { UtilityNavId } from "@/config/utility-shell";

/** Inbound return origin from `?from=` — whitelist only. Never an open redirect. */
export function parseHelpCenterFromParam(value: string | null): HelpCenterFrom | null {
  if (!value || !isHelpCenterFrom(value)) return null;
  return value;
}

/**
 * Resolve Help Center Back navigation from inbound return origin.
 * Does not participate in `UtilityPageHeader.helpCenterFrom` (outbound emitter context).
 */
export function resolveHelpCenterBackHref(from: HelpCenterFrom | null): string {
  if (from === "studio-lobby") return helpCenter.routes.studioLobby;
  if (from === "campaign-details") return helpCenter.routes.campaignDetails;
  if (from === "studio-board") return helpCenter.routes.studioBoard;
  if (from === "review-room") return helpCenter.routes.reviewRoom;
  if (from === "deliverables") return helpCenter.routes.deliverables;
  if (from === "final-delivery-room") return helpCenter.routes.finalDeliveryRoom;
  if (from === "package-detail") return helpCenter.routes.packageDetail;
  if (from === "short-form-package-detail") return helpCenter.routes.shortFormPackageDetail;
  if (from === "social-package-detail") return helpCenter.routes.socialPackageDetail;
  if (from === "creative-qa-package-detail") return helpCenter.routes.studioLobby;
  if (from === "campaign-launch-package-detail") return helpCenter.routes.campaignLaunchPackageDetail;
  if (from === "project-builder") return helpCenter.routes.projectBuilder;
  if (from === "checkout") return helpCenter.routes.checkout;
  if (from === "payment" || from === "route-map" || from === "conversation-room") {
    return helpCenter.routes.conversationRoom;
  }
  return helpCenter.routes.studioLobby;
}

/** Customer-facing Back label for the same inbound origin as `resolveHelpCenterBackHref`. */
export function resolveHelpCenterBackLabel(from: HelpCenterFrom | null): string {
  if (from === "studio-lobby" || from == null) {
    return `← ${helpCenter.backLabels.studioLobby}`;
  }
  if (from === "campaign-details") {
    return `← ${helpCenter.backLabels.campaignDetails}`;
  }
  if (from === "studio-board") {
    return `← ${helpCenter.backLabels.studioBoard}`;
  }
  if (from === "review-room") {
    return `← ${helpCenter.backLabels.reviewRoom}`;
  }
  if (from === "deliverables" || from === "final-delivery-room") {
    return `← ${helpCenter.backLabels.finalDeliveryRoom}`;
  }
  if (
    from === "package-detail" ||
    from === "short-form-package-detail" ||
    from === "social-package-detail" ||
    from === "creative-qa-package-detail" ||
    from === "campaign-launch-package-detail"
  ) {
    return `← ${helpCenter.backLabels.packageDetail}`;
  }
  if (from === "project-builder") {
    return `← ${helpCenter.backLabels.projectBuilder}`;
  }
  if (from === "checkout") {
    return `← ${helpCenter.backLabels.checkout}`;
  }
  return `← ${helpCenter.backLabels.conversationRoom}`;
}

export function isHelpCenterProtectedDoorPath(href: string): boolean {
  const [pathname] = href.split("?");
  return (
    pathname === studioBoard.routes.studioBoard ||
    pathname === studioBoard.routes.campaignDetails ||
    pathname === studioBoard.routes.feedbackStudio ||
    pathname === studioBoard.routes.deliverables
  );
}

/** Existing auth return-to. Does not invent a new auth contract. */
export function studioSignInHref(destination: string): string {
  return `/sign-in?from=${encodeURIComponent(destination)}`;
}

/**
 * Protected Help doors stay on their live room when signed in.
 * Unsigned customers go through the existing sign-in `from=` return.
 */
export function resolveHelpCenterProtectedHref(destination: string, signedIn: boolean): string {
  if (signedIn || !isHelpCenterProtectedDoorPath(destination)) return destination;
  return studioSignInHref(destination);
}

export function resolveHelpCenterProtectedAriaLabel(
  label: string,
  destination: string,
  signedIn: boolean,
  mode: "open" | "return" = "open",
): string {
  if (signedIn || !isHelpCenterProtectedDoorPath(destination)) return label;
  const roomName = label.replace(/^←\s*(Back to\s*)?/, "");
  return mode === "return" ? `Sign in to return to ${roomName}` : `Sign in to open ${roomName}`;
}

/** Help tile on utility rooms carries the page origin so Back can return. */
export function resolveHelpCenterOriginForUtilityNav(
  activeId: UtilityNavId,
  explicit?: HelpCenterFrom,
): HelpCenterFrom | undefined {
  if (activeId === "help-center") return undefined;
  if (explicit && isHelpCenterFrom(explicit)) return explicit;
  if (activeId === "studio-board") return "studio-board";
  if (activeId === "campaign-details") return "campaign-details";
  if (activeId === "review-room") return "review-room";
  if (activeId === "deliverables") return "deliverables";
  if (activeId === "payment") return "payment";
  if (activeId === "past-campaigns" || activeId === "account") return undefined;
  return undefined;
}
