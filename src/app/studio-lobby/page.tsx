import WelcomeHallStaticScene from "@/components/entrance/WelcomeHallStaticScene";

import "../mobile-route-fixes.css";

/** Studio Lobby — kiosk routes to Project Discovery. */
export default function StudioLobbyPage() {
  return (
    <main className="flex min-h-[100dvh] flex-1 flex-col">
      <WelcomeHallStaticScene />
    </main>
  );
}
