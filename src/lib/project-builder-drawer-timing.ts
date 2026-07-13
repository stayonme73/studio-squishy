/** Presentation-only — scannable timeline bullets for the Learn More drawer. */
export function expandDrawerTimelineItems(timingLabel: string): string[] {
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
