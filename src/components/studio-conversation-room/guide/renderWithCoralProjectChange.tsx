import { type ReactNode } from "react";

/** Marks the Project Change / still-editable clause so last-paint can coral it. */
export function renderWithCoralProjectChange(text: string): ReactNode {
  const later = text.search(/later changes/i);
  const still = text.search(/you can still make changes/i);
  const at = later >= 0 ? later : still;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span data-project-change-note="true">{text.slice(at)}</span>
    </>
  );
}
