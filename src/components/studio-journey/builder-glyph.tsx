type GlyphName = "expand" | "collapse" | "continue" | "complete" | "help";

const PATHS: Record<GlyphName, string> = {
  expand: "M6 9l6 6 6-6",
  collapse: "M6 15l6-6 6 6",
  continue: "M5 12h14M13 6l6 6-6 6",
  complete: "M20 6 9 17l-5-5",
  help: "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4",
};

export function BuilderGlyph({
  name,
  size = 24,
}: {
  name: GlyphName;
  size?: number;
}) {
  return (
    <svg
      className="studio-build__glyph"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {name === "help" ? (
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.25" />
      ) : null}
      <path
        d={PATHS[name]}
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {name === "help" ? (
        <path
          d="M12 17h.01"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}
