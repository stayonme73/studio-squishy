import type { PurchasedJobRecord } from "./types";

/** Client may open Final Delivery when Owner has released and files are available. */
export function canClientAccessJobDelivery(job: PurchasedJobRecord): boolean {
  return job.spineStatus === "ready_for_delivery" || job.spineStatus === "delivered";
}

export function isJobDeliveredToClient(job: PurchasedJobRecord): boolean {
  return job.spineStatus === "delivered";
}
