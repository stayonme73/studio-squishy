import type { ReactNode } from "react";

import UtilityPageFrame from "@/components/shared/UtilityPageFrame";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Feedback Studio room shell — Studio lobby backdrop with sketch UI on top. */
export default function FeedbackStudioLayout({ children, className }: Props) {
  return (
    <UtilityPageFrame navId="review-room">
      <div className={`fs-room${className ? ` ${className}` : ""}`}>{children}</div>
    </UtilityPageFrame>
  );
}
