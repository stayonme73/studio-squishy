/**
 * Discovery brief validation — no external schema library.
 */

import type { DiscoveryBrief } from "@/recommendation/types";

export class DiscoveryBriefValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscoveryBriefValidationError";
  }
}

export function validateDiscoveryBrief(brief: DiscoveryBrief): void {
  if (!brief || typeof brief !== "object") {
    throw new DiscoveryBriefValidationError("Discovery brief must be an object.");
  }
  if (!brief.answers || typeof brief.answers !== "object") {
    throw new DiscoveryBriefValidationError("Discovery brief must include answers.");
  }
}
