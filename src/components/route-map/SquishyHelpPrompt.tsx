"use client";

import { useCallback, useState } from "react";

import { SQUISHY_HELP_PROMPT } from "@/config/route-map-guidance-v1";

type Props = {
  /**
   * Whether the Help Prompt is shown. Always-visible for this package (default true).
   * Phase 2 can gate this on hesitation — e.g. a brief pause before route selection —
   * by passing `visible` from the parent, without changing this component or the Route Map layout.
   */
  visible?: boolean;
  /**
   * Fires when the customer opens Squishy's help message. Reserved hook for future
   * context-aware behavior (analytics, driving a shared Squishy surface). Optional.
   */
  onOpen?: () => void;
};

/**
 * Squishy Help Prompt — lightweight reassurance on the Route Map main screen.
 *
 * Not a route, not a service, not a panel: one prompt line and one button that let Squishy
 * quietly offer to help a hesitating customer choose a verified project. Confident customers
 * ignore it and click their route. Navigation and reassurance only — it never touches pricing,
 * selected services, or checkout state.
 */
export default function SquishyHelpPrompt({ visible = true, onOpen }: Props) {
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setOpen(true);
    onOpen?.();
  }, [onOpen]);

  if (!visible) return null;

  return (
    <div className="route-map-help-prompt">
      <p className="route-map-help-prompt__prompt">{SQUISHY_HELP_PROMPT.prompt}</p>
      <button
        type="button"
        className="route-map-help-prompt__cta"
        onClick={handleOpen}
        aria-expanded={open}
        aria-label={SQUISHY_HELP_PROMPT.cta}
      >
        {SQUISHY_HELP_PROMPT.cta}
      </button>
      {open ? (
        <p className="route-map-help-prompt__message" role="status" aria-live="polite">
          <span className="route-map-help-prompt__squishy-label">Squishy</span>
          {SQUISHY_HELP_PROMPT.squishyMessage}
        </p>
      ) : null}
    </div>
  );
}
