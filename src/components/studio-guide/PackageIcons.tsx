type IconProps = { className?: string };

export function SparkPackageIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <path
        d="M24 8l2.2 8.8L35 19l-8.8 2.2L24 30l-2.2-8.8L13 19l8.8-2.2L24 8z"
        fill="currentColor"
      />
      <path
        d="M24 32l1.2 4.8L30 38l-4.8 1.2L24 44l-1.2-4.8L18 38l4.8-1.2L24 32z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}

export function MomentumPackageIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="14" r="4" fill="currentColor" />
      <circle cx="32.7" cy="29" r="4" fill="currentColor" opacity="0.85" />
      <circle cx="15.3" cy="29" r="4" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export function GrowthPackageIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <rect x="12" y="28" width="5" height="10" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="21" y="22" width="5" height="16" rx="1" fill="currentColor" opacity="0.75" />
      <rect x="30" y="14" width="5" height="24" rx="1" fill="currentColor" />
      <path d="M14 26l8-6 6 4 8-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function RocketIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16 4c-2 6-3 10-3 14 0 2 .5 4 1.5 5.5L16 28l1.5-4.5c1-1.5 1.5-3.5 1.5-5.5 0-4-1-8-3-14z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <circle cx="16" cy="14" r="2" fill="currentColor" />
      <path d="M12 24l-3 4M20 24l3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FlaskIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M13 6h6v8l6 12a3 3 0 01-2.6 4.5H9.6A3 3 0 017 26L13 14V6z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path d="M12 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function TargetIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function HeadsetIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M8 18v-2a8 8 0 0116 0v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect x="6" y="18" width="4" height="8" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="22" y="18" width="4" height="8" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ShieldTrustIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.12"
      />
    </svg>
  );
}

export function TeamTrustIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 19c0-3 2.5-5 5-5M14 19c0-2.5 1.8-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ImpactTrustIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="14" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.5" />
      <rect x="10" y="10" width="3" height="10" rx="0.5" fill="currentColor" opacity="0.75" />
      <rect x="16" y="6" width="3" height="14" rx="0.5" fill="currentColor" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 6h12M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function BackArrowIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const PACKAGE_ICONS = {
  spark: SparkPackageIcon,
  momentum: MomentumPackageIcon,
  growth: GrowthPackageIcon,
} as const;

const FEATURE_ICONS = {
  rocket: RocketIcon,
  flask: FlaskIcon,
  target: TargetIcon,
} as const;

const TRUST_ICONS = {
  proven: ShieldTrustIcon,
  team: TeamTrustIcon,
  impact: ImpactTrustIcon,
} as const;

export function PackageIcon({ id, className }: { id: keyof typeof PACKAGE_ICONS; className?: string }) {
  const Icon = PACKAGE_ICONS[id];
  return <Icon className={className} />;
}

export function FeatureIcon({
  name,
  className,
}: {
  name: keyof typeof FEATURE_ICONS;
  className?: string;
}) {
  const Icon = FEATURE_ICONS[name];
  return <Icon className={className} />;
}

export function TrustIcon({ id, className }: { id: keyof typeof TRUST_ICONS; className?: string }) {
  const Icon = TRUST_ICONS[id];
  return <Icon className={className} />;
}
