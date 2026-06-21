import { Suspense } from "react";
import { Caveat, Inter } from "next/font/google";

import StudioBoardScene from "@/components/studio-board/StudioBoardScene";

import "../studio-board.css";
import "../mobile-route-fixes.css";

/** Script accent for sidebar brand “the” only. */
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-studio-board-script",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-studio-board-sans",
});

/** Studio Board — campaign status check-in. */
export default function StudioBoardPage() {
  return (
    <main
      className={`${inter.variable} ${caveat.variable} journey-shell flex h-[100dvh] max-h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden bg-[var(--board-family-cream)]`}
    >
      <Suspense>
        <StudioBoardScene />
      </Suspense>
    </main>
  );
}
