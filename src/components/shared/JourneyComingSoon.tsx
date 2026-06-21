import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import type { UtilityNavId } from "@/config/utility-shell";
import { studioBoard } from "@/config/studio-board";

type Props = {
  title: string;
  body: string;
  backHref?: string;
  activeNav?: UtilityNavId;
};

/** Minimal coming-soon shell for routes not built in V1. */
export default function JourneyComingSoon({
  title,
  body,
  backHref = studioBoard.routes.studioBoard,
  activeNav = "studio-board",
}: Props) {
  return (
    <UtilityPageFrame navId={activeNav}>
      <div className="utility-page">
        <UtilityPageHeader backHref={backHref} activeNav={activeNav} title={title} lead={body} />
      </div>
    </UtilityPageFrame>
  );
}
