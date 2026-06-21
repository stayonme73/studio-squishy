import JourneyComingSoon from "@/components/shared/JourneyComingSoon";
import { studioBoard } from "@/config/studio-board";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

/** Account settings (V1 placeholder). */
export default function AccountPage() {
  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-[var(--utility-paper-cream)]`}
    >
      <JourneyComingSoon
        title="My Account"
        body={studioBoard.placeholders.account}
        backHref={studioBoard.routes.studioBoard}
        activeNav="account"
      />
    </main>
  );
}
