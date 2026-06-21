import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Studio Canvas backdrop wrapper — apply only after utility design system lock.
 * Structural shell only; backdrop styling lives in studio-canvas.css.
 */
export default function StudioCanvasLayout({ children, className }: Props) {
  return (
    <div className={`studio-canvas${className ? ` ${className}` : ""}`}>
      <div className="studio-canvas__backdrop" aria-hidden="true" />
      <div className="studio-canvas__content">{children}</div>
    </div>
  );
}
