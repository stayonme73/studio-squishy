/**
 * Static Studio Guide portrait — canonical asset per docs/squishy-character-standards-v1.md.
 * Presentational only: no pose variants, no state, no business logic.
 */
export default function RouteMapSquishyGuide() {
  return (
    <div className="route-map-squishy-guide" aria-hidden="true">
      <img
        className="route-map-squishy-guide__art"
        src="/squishy/squishy-studio-guide-v1.png"
        alt=""
        draggable={false}
      />
    </div>
  );
}
