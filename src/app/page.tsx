import WelcomeHallStaticScene from "@/components/entrance/WelcomeHallStaticScene";

import "./mobile-route-fixes.css";

/** Welcome Hall V2 — kiosk routes to Business Discovery Studio. */
export default function WelcomeHallPage() {
  return (
    <main className="flex min-h-[100dvh] flex-1 flex-col">
      <WelcomeHallStaticScene />
    </main>
  );
}
