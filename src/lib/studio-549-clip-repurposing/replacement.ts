import { studio549ClipRepurposingIoFreezeV1 as freeze } from "@/config/studio-549-clip-repurposing-io-freeze-v1";

const WEEKEND = new Set([0, 6]);

export function addBusinessDays(fromIso: string, days: number): string {
  const date = new Date(fromIso);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Replacement window needs a real notice timestamp.");
  }
  let added = 0;
  while (added < days) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (!WEEKEND.has(date.getUTCDay())) added += 1;
  }
  return date.toISOString();
}

export function replacementDeadlineIso(shortfallNoticedAt: string): string {
  return addBusinessDays(
    shortfallNoticedAt,
    freeze.sourceQualityResubmission.windowBusinessDays,
  );
}

export type Clip549ReplacementWindow =
  | {
      status: "open";
      deadlineAt: string;
      paymentHeld: true;
      jobActive: true;
      replacementPrivilegeOpen: true;
    }
  | {
      status: "received_on_time";
      deadlineAt: string;
      receivedAt: string;
      paymentHeld: true;
      jobActive: true;
      replacementPrivilegeOpen: false;
    }
  | {
      status: "expired_close_refund";
      deadlineAt: string;
      paymentHeld: false;
      jobActive: false;
      replacementPrivilegeOpen: false;
      lateSourceOnThisOrder: "refused_must_place_new_order";
    }
  | {
      status: "late_refused_new_order";
      deadlineAt: string;
      receivedAt: string;
      paymentHeld: false;
      jobActive: false;
      replacementPrivilegeOpen: false;
      lateSourceOnThisOrder: "refused_must_place_new_order";
    };

export function evaluateClip549ReplacementWindow(input: {
  shortfallNoticedAt: string;
  now: string;
  replacementReceivedAt?: string;
}): Clip549ReplacementWindow {
  const deadlineAt = replacementDeadlineIso(input.shortfallNoticedAt);
  const now = input.now;
  const received = input.replacementReceivedAt;

  if (received && received <= deadlineAt) {
    return {
      status: "received_on_time",
      deadlineAt,
      receivedAt: received,
      paymentHeld: true,
      jobActive: true,
      replacementPrivilegeOpen: false,
    };
  }
  if (received && received > deadlineAt) {
    return {
      status: "late_refused_new_order",
      deadlineAt,
      receivedAt: received,
      paymentHeld: false,
      jobActive: false,
      replacementPrivilegeOpen: false,
      lateSourceOnThisOrder: freeze.sourceQualityResubmission.lateSourceOnClosedOrder,
    };
  }
  if (now <= deadlineAt) {
    return {
      status: "open",
      deadlineAt,
      paymentHeld: true,
      jobActive: true,
      replacementPrivilegeOpen: true,
    };
  }
  return {
    status: "expired_close_refund",
    deadlineAt,
    paymentHeld: false,
    jobActive: false,
    replacementPrivilegeOpen: false,
    lateSourceOnThisOrder: freeze.sourceQualityResubmission.lateSourceOnClosedOrder,
  };
}

export function laterReturnIsNewOrder(): {
  newClipOrder: true;
  newPayment: true;
  newIntake: true;
  currentQueueCapacity: true;
  inheritedPriority: false;
} {
  return {
    newClipOrder: true,
    newPayment: true,
    newIntake: true,
    currentQueueCapacity: true,
    inheritedPriority: false,
  };
}
