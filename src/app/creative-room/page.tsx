import JourneyComingSoon from "@/components/shared/JourneyComingSoon";
import { studioBoard } from "@/config/studio-board";

/** Creative Room — planned environment (V1 placeholder). */
export default function CreativeRoomPage() {
  return (
    <main className="journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden">
      <JourneyComingSoon
        title="Creative Room"
        body="Creative Room is planned for a future phase."
        backHref={studioBoard.routes.studioBoard}
        activeNav="studio-board"
      />
    </main>
  );
}
