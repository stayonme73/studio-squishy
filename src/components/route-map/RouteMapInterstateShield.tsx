type ShieldVariant = "i75" | "i20" | "i285" | "random";

type Props = {
  number: string;
  variant: ShieldVariant;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Banner text above the number — defaults to the classic interstate shield label. */
  label?: string;
  /** Studio Route badge treatment (light pill, colored accent) instead of the classic red/blue shield. */
  studio?: boolean;
};

export default function RouteMapInterstateShield({
  number,
  variant,
  className = "",
  size = "md",
  label = "INTERSTATE",
  studio = false,
}: Props) {
  return (
    <span
      className={`route-map-interstate-shield route-map-interstate-shield--${variant} route-map-interstate-shield--${size} ${studio ? "route-map-interstate-shield--studio" : ""} ${className}`.trim()}
      aria-hidden
    >
      <span className="route-map-interstate-shield__banner">{label}</span>
      <span className="route-map-interstate-shield__num">{number}</span>
    </span>
  );
}
