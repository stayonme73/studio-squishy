import { Suspense } from "react";

import WelcomeHallWelcomeScene from "@/components/entrance/WelcomeHallWelcomeScene";

/**
 * Welcome Hall V2 — wonder, impress, kiosk to Draft Room intake.
 * Tower rotation dormant (TOWER_ROTATION_ENABLED = false).
 * @see docs/illustration/welcome-hall-pivot.md
 * @see src/config/welcome-hall-tower.ts
 */
export default function WelcomeHallStaticScene({
  initialChoseNew = false,
}: {
  initialChoseNew?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <WelcomeHallWelcomeScene initialChoseNew={initialChoseNew} />
    </Suspense>
  );
}
