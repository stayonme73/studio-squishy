import Link from "next/link";
import type { ReactNode } from "react";

import { utilityShell, type UtilityNavId } from "@/config/utility-shell";

const navIcons: Record<(typeof utilityShell.nav)[number]["id"], ReactNode> = {
  "studio-board": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  "campaign-details": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 4h12v16H8z" />
      <path d="M4 8h2M4 12h2M4 16h2" strokeLinecap="round" />
    </svg>
  ),
  "review-room": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ),
  deliverables: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </svg>
  ),
  "help-center": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.25a2.75 2.75 0 0 1 4.8 1.4c0 1.65-2.3 2.1-2.3 3.6" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  ),
};

type Props = {
  activeId: UtilityNavId;
};

/** Optional secondary nav — icon + label per design system guide. */
export default function UtilityNav({ activeId }: Props) {
  return (
    <nav aria-label="Studio utility navigation">
      <ul className="utility-subnav__list">
        {utilityShell.nav.map((item) => (
          <li key={item.id} className="utility-subnav__item">
            <Link
              href={item.href}
              className={`utility-subnav__link${
                item.id === activeId ? " utility-subnav__link--active" : ""
              }`}
              aria-current={item.id === activeId ? "page" : undefined}
            >
              <span className="utility-subnav__icon">{navIcons[item.id]}</span>
              <span className="utility-subnav__label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
