"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { DEV_STATUS_OPTIONS } from "@/lib/studio-board-dev-status";
import { isDevToolsEnabled } from "@/lib/dev-tools-enabled";
import { clearCampaignState } from "@/lib/studio-board-campaign";

type Placement = "sidebar" | "header";

function StudioBoardDevStatusPanel({ placement }: { placement: Placement }) {
  const pathname = usePathname();
  const router = useRouter();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function handleReset() {
    clearCampaignState();
    router.replace(pathname);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`sb-dev-status sb-dev-status--${placement}${open ? " sb-dev-status--open" : ""}`}
    >
      <button
        type="button"
        className="sb-dev-status__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            strokeLinecap="round"
          />
        </svg>
        Dev settings
      </button>

      {open ? (
        <div id={panelId} className="sb-dev-status__panel" role="region" aria-label="Developer tools">
          <p className="sb-dev-status__label">Dev tools (local only)</p>
          <p className="sb-dev-status__hint">
            Jump campaign status for testing, or reset to start the intake flow fresh.
          </p>
          <div className="sb-dev-status__buttons">
            {DEV_STATUS_OPTIONS.map(({ param, label }) => (
              <Link
                key={param}
                href={`${pathname}?status=${param}`}
                className="sb-dev-status__btn"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <button
              type="button"
              className="sb-dev-status__btn sb-dev-status__btn--reset"
              onClick={handleReset}
            >
              Reset campaign
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Dev settings — sidebar on board pages when NEXT_PUBLIC_DEV_TOOLS=1. */
export default function StudioBoardDevStatus({
  placement = "sidebar",
}: {
  placement?: Placement;
}) {
  if (!isDevToolsEnabled()) return null;
  return <StudioBoardDevStatusPanel placement={placement} />;
}
