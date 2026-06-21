import { studioBoard } from "@/config/studio-board";

const { ideaWall: copy, assets } = studioBoard;

function ideaWallSrcSet(src: string) {
  const [path, query = ""] = src.split("?");
  const hi = path.replace(/\.png$/i, "@2x.png");
  const q = query ? `?${query}` : "";
  return `${path}${q} 1x, ${hi}${q} 2x`;
}

/** Sidebar Idea Wall — chalkboard illustration fills available sidebar space. */
export default function IdeaWall() {
  return (
    <section className="sb-idea-wall" aria-label={copy.heading}>
      <div className="sb-idea-wall__art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={assets.sidebarDesk}
          srcSet={ideaWallSrcSet(assets.sidebarDesk)}
          sizes="(max-width: 56rem) 100vw, 14rem"
          alt=""
          className="sb-idea-wall__desk"
          draggable={false}
        />
      </div>
    </section>
  );
}
