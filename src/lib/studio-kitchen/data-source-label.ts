import { studioKitchenFoundation } from "@/config/studio-kitchen-foundation-v1";

import type { KitchenDataSource } from "./types";

export function kitchenDataSourceLabel(source: KitchenDataSource): string {
  return source === "live_production"
    ? studioKitchenFoundation.page.liveBadge
    : studioKitchenFoundation.page.fixtureBadge;
}
