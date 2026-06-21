import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * Full-viewport entrance environment — warm industrial lobby scaffold.
 * CSS and layout only; final illustration art replaces layers later.
 */
export default function EntranceScene({ children }: Props) {
  return (
    <div className="entrance-scene relative w-full overflow-hidden">
      {/* Ambient warm lighting */}
      <div className="entrance-light entrance-light--warm-left" aria-hidden />
      <div className="entrance-light entrance-light--golden" aria-hidden />
      <div className="entrance-light entrance-light--teal-accent" aria-hidden />

      {/* Cream wall base */}
      <div className="absolute inset-0 bg-[var(--studio-cream)]" aria-hidden />

      {/* Denim structural band — left wall depth */}
      <div
        className="absolute bottom-0 left-0 top-0 w-[18%] bg-[var(--studio-denim)] opacity-[0.92]"
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-[17%] top-0 w-px bg-[var(--studio-matte-black)] opacity-20"
        aria-hidden
      />

      {/* Exposed ceiling */}
      <div className="entrance-ceiling absolute inset-x-0 top-0 h-[14%]" aria-hidden>
        <div className="entrance-pipe entrance-pipe--a" />
        <div className="entrance-pipe entrance-pipe--b" />
        <div className="entrance-pipe entrance-pipe--c" />
        <div className="entrance-pipe entrance-pipe--d" />
      </div>

      {/* Glass partition — glimpse of studio beyond */}
      <div className="entrance-glass-wall absolute right-[8%] top-[14%] h-[58%] w-[52%]" aria-hidden>
        <div className="entrance-glass-panel entrance-glass-panel--left" />
        <div className="entrance-glass-panel entrance-glass-panel--right" />
        <div className="entrance-glass-mullion" />
        {/* Hint of studio space beyond the glass */}
        <div className="entrance-beyond-glass" />
      </div>

      {/* Walnut entry bench / accent ledge */}
      <div className="entrance-walnut-ledge absolute bottom-[22%] left-[6%] h-3 w-[28%]" aria-hidden />
      <div className="entrance-walnut-frame absolute bottom-[21.5%] left-[5.5%] h-[18%] w-[29%] border border-[var(--studio-walnut)] opacity-30" aria-hidden />

      {/* Accent lamp — burnt orange sparingly */}
      <div className="entrance-accent-lamp absolute right-[14%] top-[22%]" aria-hidden>
        <div className="entrance-lamp-shade" />
        <div className="entrance-lamp-glow" />
      </div>

      {/* Polished concrete floor */}
      <div className="entrance-floor absolute inset-x-0 bottom-0 h-[24%]" aria-hidden>
        <div className="entrance-floor-gloss" />
        <div className="entrance-floor-reflection" />
      </div>

      {/* Floor shadow from glass wall */}
      <div
        className="absolute bottom-[24%] right-[8%] h-8 w-[52%] bg-[var(--studio-matte-black)] opacity-[0.06] blur-md"
        aria-hidden
      />

      {/* Content layer — constrained to left column, clear of glass */}
      <div className="entrance-content">
        <div aria-hidden className="entrance-content-spacer" />
        <div className="entrance-content-body">{children}</div>
      </div>
    </div>
  );
}
