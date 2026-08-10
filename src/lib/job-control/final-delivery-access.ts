import type { PurchasedJobRecord } from "./types";

/** Client may open Final Delivery when Owner has released and approval identity is bound. */
export function canClientAccessJobDelivery(job: PurchasedJobRecord): boolean {
  if (job.spineStatus !== "ready_for_delivery" && job.spineStatus !== "delivered") {
    return false;
  }
  // Fail closed: released spine without customer approval pin is a bypass.
  return job.customerApprovedArtifactAuthorization?.status === "CUSTOMER_APPROVED";
}

export function isJobDeliveredToClient(job: PurchasedJobRecord): boolean {
  return job.spineStatus === "delivered";
}
