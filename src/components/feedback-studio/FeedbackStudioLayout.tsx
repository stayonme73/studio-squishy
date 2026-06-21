import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Feedback Studio room shell — clean canvas; sketch styling lives in UI components only. */
export default function FeedbackStudioLayout({ children, className }: Props) {
  return <div className={`fs-room${className ? ` ${className}` : ""}`}>{children}</div>;
}
