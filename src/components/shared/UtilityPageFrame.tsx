import type { ReactNode } from "react";

import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
import { utilityPageUsesBackdrop } from "@/config/studio-utility-standards";
import type { UtilityNavId } from "@/config/utility-shell";

type Props = {
  navId: UtilityNavId;
  children: ReactNode;
};

/** Applies Studio Lobby backdrop on in-scope utility routes only. */
export default function UtilityPageFrame({ navId, children }: Props) {
  if (!utilityPageUsesBackdrop(navId)) {
    return <>{children}</>;
  }

  return (
    <div className="studio-utility-scene">
      <StudioUtilityBackdrop placement="viewport" />
      <div className="studio-utility-scene__content">{children}</div>
    </div>
  );
}
