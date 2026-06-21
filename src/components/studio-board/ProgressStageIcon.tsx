import type { CampaignStatus } from "@/config/studio-board";

type Props = {
  stage: CampaignStatus;
};

/** Small monochrome stage icons — subtle identity, not decorative emoji. */
export default function ProgressStageIcon({ stage }: Props) {
  const common = {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.35,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (stage) {
    case "DRAFT_RECEIVED":
      return (
        <svg {...common} aria-hidden>
          <path d="M4.5 2.5h5.8l2.2 2.2v8.8a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
          <path d="M10.3 2.5V5h2.2M5.5 8h5M5.5 10.5h3.5" />
        </svg>
      );
    case "PAYMENT_RECEIVED":
      return (
        <svg {...common} aria-hidden>
          <rect x="2.5" y="4.5" width="11" height="7" rx="1.2" />
          <path d="M2.5 7h11M5 10h2.5" />
        </svg>
      );
    case "BUILDING_CONCEPTS":
      return (
        <svg {...common} aria-hidden>
          <path d="M8 2.2c2.2 1.6 3.5 3.4 3.5 5.3S10.2 12.8 8 14.5C5.8 12.8 4.5 11 4.5 7.5S5.8 3.8 8 2.2Z" />
          <circle cx="6.2" cy="6.8" r="0.55" fill="currentColor" stroke="none" />
          <circle cx="8.3" cy="5.6" r="0.55" fill="currentColor" stroke="none" />
          <circle cx="9.6" cy="7.9" r="0.55" fill="currentColor" stroke="none" />
        </svg>
      );
    case "READY_FOR_REVIEW":
      return (
        <svg {...common} aria-hidden>
          <path d="M3.5 7.2a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0Z" />
          <circle cx="6.1" cy="7.2" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="9.9" cy="7.2" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "DELIVERED":
      return (
        <svg {...common} aria-hidden>
          <path d="M3 5.5 8 3l5 2.5V12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5.5Z" />
          <path d="M3 5.5 8 8l5-2.5M8 8v6" />
        </svg>
      );
    default:
      return null;
  }
}
