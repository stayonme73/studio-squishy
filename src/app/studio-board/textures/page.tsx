import { Caveat, Inter } from "next/font/google";

import BoardTextureExploration from "@/components/studio-board/BoardTextureExploration";

import "../../studio-board-textures.css";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-studio-board-script",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-studio-board-sans",
});

/** Texture swatch review — not the live Studio Board. */
export default function StudioBoardTexturesPage() {
  return (
    <main
      className={`${inter.variable} ${caveat.variable} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-auto bg-[var(--board-family-cream)]`}
    >
      <BoardTextureExploration />
    </main>
  );
}
