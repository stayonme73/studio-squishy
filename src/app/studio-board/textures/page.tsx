import { studioBoardScriptFont } from "@/fonts/studio-board-script";

import BoardTextureExploration from "@/components/studio-board/BoardTextureExploration";

import "../../studio-board-textures.css";

/** Texture swatch review — not the live Studio Board. Inter loads once in root layout. */
export default function StudioBoardTexturesPage() {
  return (
    <main
      className={`${studioBoardScriptFont.variable} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-auto bg-[var(--board-family-cream)]`}
    >
      <BoardTextureExploration />
    </main>
  );
}
