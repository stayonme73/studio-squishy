import WelcomeHallStaticScene from "@/components/entrance/WelcomeHallStaticScene";

import "./mobile-route-fixes.css";

/** Welcome Hall V2 — kiosk routes to Draft Room intake. */
export default function WelcomeHallPage() {
  return (
    <main className="flex h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden">
      <WelcomeHallStaticScene />
    </main>
  );
}
