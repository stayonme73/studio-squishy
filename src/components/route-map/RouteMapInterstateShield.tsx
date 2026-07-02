type ShieldVariant = "i75" | "i20" | "i285";

type Props = {
  number: string;
  variant: ShieldVariant;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export default function RouteMapInterstateShield({
  number,
  variant,
  className = "",
  size = "md",
}: Props) {
  return (
    <span
      className={`route-map-interstate-shield route-map-interstate-shield--${variant} route-map-interstate-shield--${size} ${className}`.trim()}
      aria-hidden
    >
      <span className="route-map-interstate-shield__banner">INTERSTATE</span>
      <span className="route-map-interstate-shield__num">{number}</span>
    </span>
  );
}
