import JourneyComingSoon from "@/components/shared/JourneyComingSoon";
import { studioBoard } from "@/config/studio-board";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

/** Past campaigns archive (V1 placeholder). */
export default function PastCampaignsPage() {
  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-[var(--utility-paper-cream)]`}
    >
      <JourneyComingSoon
        title="Past Campaigns"
        body={studioBoard.placeholders.pastCampaigns}
        backHref={studioBoard.routes.studioBoard}
        activeNav="past-campaigns"
      />
    </main>
  );
}
