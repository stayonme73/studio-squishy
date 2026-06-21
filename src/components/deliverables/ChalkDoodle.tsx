type DoodleKind = "star" | "bulb" | "spark" | "trend" | "arrow" | "rocket";

type Props = {
  kind: DoodleKind;
};

const inkProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.65,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Tiny hand-sketched yellow marks — chalk-wall doodles, not emoji. */
export default function ChalkDoodle({ kind }: Props) {
  return (
    <span className="fd-chalk-doodle" aria-hidden>
      <svg className="fd-chalk-doodle__svg" viewBox="0 0 16 16" focusable="false">
        <g className="fd-chalk-doodle__halo">
          {kind === "star" ? (
            <path
              {...inkProps}
              strokeWidth={2.1}
              d="M8 2.2 9.1 6.3 13.4 6.5 10 8.9 11.2 13 8 10.6 4.7 13 5.9 8.9 2.5 6.5 6.8 6.3Z"
            />
          ) : null}
          {kind === "bulb" ? (
            <>
              <path {...inkProps} strokeWidth={2} d="M8 2.8c-2.1.2-3.4 1.8-3.2 3.6.2 1.3 1.1 2.2 1.8 2.8.5.4.7.9.7 1.4" />
              <path {...inkProps} strokeWidth={2} d="M6.2 11.8h3.6M7 13.2h2" />
            </>
          ) : null}
          {kind === "spark" ? (
            <>
              <path {...inkProps} strokeWidth={1.9} d="M8 3.2v9.6M4.4 8h7.2" />
              <path {...inkProps} strokeWidth={1.8} d="M5.6 5.6 10.4 10.4M10.4 5.6 5.6 10.4" />
            </>
          ) : null}
          {kind === "trend" ? (
            <>
              <path {...inkProps} strokeWidth={2} d="M3.2 11.2 6.8 8.1 9.1 9.4 12.6 5.2" />
              <path {...inkProps} strokeWidth={2} d="M10.8 5h2.2v2.1" />
            </>
          ) : null}
          {kind === "arrow" ? (
            <path
              {...inkProps}
              strokeWidth={2}
              d="M3.5 10.2c2.4-3.8 5.2-5.4 9-6.2M9.8 3.4l2.4-.5-.8 2.3"
            />
          ) : null}
          {kind === "rocket" ? (
            <>
              <path {...inkProps} strokeWidth={2} d="M8.2 3.4c-1.8 2.1-2.6 4.5-2.4 7.1l2.2-1.1 2.3 1.2c.4-2.6-.2-5-1.9-7.2Z" />
              <path {...inkProps} strokeWidth={1.9} d="M6.2 11.8 5 13.6M9.8 11.8l1.4 1.6" />
            </>
          ) : null}
        </g>

        <g className="fd-chalk-doodle__mark">
          {kind === "star" ? (
            <path
              {...inkProps}
              fill="currentColor"
              fillOpacity={0.35}
              d="M8 2.2 9.1 6.3 13.4 6.5 10 8.9 11.2 13 8 10.6 4.7 13 5.9 8.9 2.5 6.5 6.8 6.3Z"
            />
          ) : null}

          {kind === "bulb" ? (
            <>
              <path {...inkProps} d="M8 2.8c-2.1.2-3.4 1.8-3.2 3.6.2 1.3 1.1 2.2 1.8 2.8.5.4.7.9.7 1.4" />
              <path {...inkProps} d="M6.2 11.8h3.6M7 13.2h2" />
              <path {...inkProps} d="M9.6 4.1c.6.5.9 1.2.8 1.9" strokeWidth={1.2} />
            </>
          ) : null}

          {kind === "spark" ? (
            <>
              <path {...inkProps} d="M8 3.2v9.6M4.4 8h7.2" strokeWidth={1.45} />
              <path {...inkProps} d="M5.6 5.6 10.4 10.4M10.4 5.6 5.6 10.4" strokeWidth={1.35} />
              <circle cx="8" cy="8" r="0.7" fill="currentColor" stroke="none" />
            </>
          ) : null}

          {kind === "trend" ? (
            <>
              <path {...inkProps} d="M3.2 11.2 6.8 8.1 9.1 9.4 12.6 5.2" />
              <path {...inkProps} d="M10.8 5h2.2v2.1" strokeWidth={1.45} />
            </>
          ) : null}

          {kind === "arrow" ? (
            <path
              {...inkProps}
              d="M3.5 10.2c2.4-3.8 5.2-5.4 9-6.2M9.8 3.4l2.4-.5-.8 2.3"
            />
          ) : null}

          {kind === "rocket" ? (
            <>
              <path {...inkProps} d="M8.2 3.4c-1.8 2.1-2.6 4.5-2.4 7.1l2.2-1.1 2.3 1.2c.4-2.6-.2-5-1.9-7.2Z" />
              <path {...inkProps} d="M6.2 11.8 5 13.6M9.8 11.8l1.4 1.6" strokeWidth={1.35} />
              <circle cx="8.2" cy="7.2" r="0.85" fill="currentColor" stroke="none" />
            </>
          ) : null}
        </g>
      </svg>
    </span>
  );
}

export type { DoodleKind };
