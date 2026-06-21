import type { ReactNode } from "react";

import StudioCanvasLayout from "@/components/studio-canvas/StudioCanvasLayout";
import { utilityPageUsesBackdrop } from "@/config/studio-utility-standards";
import type { UtilityNavId } from "@/config/utility-shell";

type Props = {
  navId: UtilityNavId;
  children: ReactNode;
};

/** Applies Studio backdrop only on routes defined in the placement guide. */
export default function UtilityPageFrame({ navId, children }: Props) {
  if (utilityPageUsesBackdrop(navId)) {
    return <StudioCanvasLayout>{children}</StudioCanvasLayout>;
  }
  return <>{children}</>;
}
