/**
 * Locked customer surfaces for lifecycle email links.
 * Do not invent routes. Email remains a nudge toward these rooms.
 */

import { customerJourneyStepRoute } from "@/config/customer-journey-v1";
import { CONVERSATION_ROOM_INTAKE_HREF } from "@/config/legacy-route-quarantine-v1";
import { resolvePublicAppOrigin } from "@/lib/auth/public-app-url";
import type { JobCommunicationEventType } from "@/lib/job-control/types";

export type LifecycleCustomerSurfaceLink = {
  label: string;
  href: string;
};

export function lifecycleCustomerSurfaceLinks(
  eventType: JobCommunicationEventType,
): LifecycleCustomerSurfaceLink[] {
  const board: LifecycleCustomerSurfaceLink = {
    label: "Studio Board",
    href: customerJourneyStepRoute("studio-board"),
  };
  switch (eventType) {
    case "intake_incomplete_materials_needed":
    case "waiting_on_client":
      return [board, { label: "Project Intake", href: CONVERSATION_ROOM_INTAKE_HREF }];
    case "ready_for_review":
    case "revision_ready_again":
      return [board, { label: "Review Room", href: customerJourneyStepRoute("review-room") }];
    case "final_delivery_available":
      return [
        board,
        { label: "Final Delivery", href: customerJourneyStepRoute("final-delivery") },
      ];
    default:
      return [board];
  }
}

function isLocalOnlyOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return true;
  }
}

export function lifecycleCustomerSurfaceAbsoluteLinks(
  eventType: JobCommunicationEventType,
): Array<LifecycleCustomerSurfaceLink & { url: string }> {
  const origin = resolvePublicAppOrigin();
  // A localhost origin works on this computer only. Omit the link until a public site address is set.
  if (!origin || isLocalOnlyOrigin(origin)) return [];
  return lifecycleCustomerSurfaceLinks(eventType).map((link) => ({
    ...link,
    url: new URL(link.href, `${origin}/`).toString(),
  }));
}
