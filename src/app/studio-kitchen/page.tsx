import StudioKitchenFileRoomScene from "@/components/studio-kitchen/StudioKitchenFileRoomScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

/** Studio Kitchen V4 — owner file room. */
export default function StudioKitchenPage() {
  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-[var(--utility-paper-cream)]`}
    >
      <StudioKitchenFileRoomScene />
    </main>
  );
}
