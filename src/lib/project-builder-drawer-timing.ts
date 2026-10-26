import { LAUNCH_MENU_HONEST_TIMING_LABEL } from "@/config/studio-menu-readiness-and-demand-freeze-v1";

/** Presentation-only — scannable timeline bullets for the Learn More drawer. */
export function expandDrawerTimelineItems(timingLabel: string): string[] {
  if (
    timingLabel === LAUNCH_MENU_HONEST_TIMING_LABEL ||
    /will not invent a start date/i.test(timingLabel)
  ) {
    return [
      LAUNCH_MENU_HONEST_TIMING_LABEL,
      "Work begins only after we receive all required materials and information from you",
      "This timing applies to this service only — not your full multi-deliverable project timeline",
      "The Studio will not invent a start date, queue number, or delivery date",
      "If you are late providing materials, approvals, or revision feedback, the wait stays honest — no invented catch-up date",
      "If The Studio causes a delay, we will tell you so honestly. That delay does not use your revision allowance and does not add a charge for extra internal time",
    ];
  }

  const rangeMatch = timingLabel.match(/Initial delivery:\s*(within\s+[^.]+?)(?:\s+after|\.$)/i);
  const rangeRaw = rangeMatch?.[1]?.replace(/^within\s+/i, "").trim();

  const deliveryLine = rangeRaw
    ? `Estimated service turnaround: ${rangeRaw.replace(/\s*[–-]\s*/g, " to ")}`
    : "Estimated service turnaround varies by service";

  return [
    deliveryLine,
    "Work begins only after we receive all required materials and information from you",
    "This timing applies to this service only — not your full multi-deliverable project timeline",
    "Final project timing is confirmed before payment when the full timeline system is in place",
    "If you are late providing materials, approvals, or revision feedback, the timeline will move — we will share an updated expectation honestly",
    "If The Studio causes a delay, we will notify you, provide a corrected expected date, and will not charge you for extra internal time or count our corrections against your revision allowance",
  ];
}
