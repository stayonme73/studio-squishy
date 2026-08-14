const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseCycleIsoDate(iso: string): Date | null {
  const m = ISO_DATE.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function validateExplicitCyclePeriod(input: {
  cycleStartDate: string;
  cycleEndDate: string;
  monthlyContentFocus: string;
}):
  | {
      ok: true;
      cycleStartDate: string;
      cycleEndDate: string;
      monthlyContentFocus: string;
    }
  | { ok: false; error: string; message: string } {
  if (typeof input.cycleStartDate !== "string" || !input.cycleStartDate.trim()) {
    return {
      ok: false,
      error: "missing_cycle_dates",
      message: "cycleStartDate (YYYY-MM-DD) is required before cycle create.",
    };
  }
  if (typeof input.cycleEndDate !== "string" || !input.cycleEndDate.trim()) {
    return {
      ok: false,
      error: "missing_cycle_dates",
      message: "cycleEndDate (YYYY-MM-DD) is required before cycle create.",
    };
  }
  const start = parseCycleIsoDate(input.cycleStartDate);
  const end = parseCycleIsoDate(input.cycleEndDate);
  if (!start || !end) {
    return {
      ok: false,
      error: "invalid_cycle_dates",
      message: "cycleStartDate and cycleEndDate must be valid YYYY-MM-DD.",
    };
  }
  if (end.getTime() < start.getTime()) {
    return {
      ok: false,
      error: "invalid_cycle_dates",
      message: "cycleEndDate must be on or after cycleStartDate.",
    };
  }
  if (
    typeof input.monthlyContentFocus !== "string" ||
    !input.monthlyContentFocus.trim()
  ) {
    return {
      ok: false,
      error: "missing_cycle_focus",
      message: "monthlyContentFocus is required before cycle create.",
    };
  }
  const focus = input.monthlyContentFocus.trim();
  if (focus === "Current cycle") {
    return {
      ok: false,
      error: "missing_cycle_focus",
      message: "\"Current cycle\" is never cycle focus authority.",
    };
  }
  return {
    ok: true,
    cycleStartDate: input.cycleStartDate.trim(),
    cycleEndDate: input.cycleEndDate.trim(),
    monthlyContentFocus: focus,
  };
}
