type Props = {
  src: string;
};

function creativeWallSrcSet(src: string) {
  const [path, query = ""] = src.split("?");
  const hi = path.replace(/\.png$/i, "@2x.png");
  const q = query ? `?${query}` : "";
  return `${path}${q} 1x, ${hi}${q} 2x`;
}

/** Campaign creation wall — visual spark for the Studio Board note column. */
export default function StudioCreativeWall({ src }: Props) {
  return (
    <div className="sb-board-art-slot">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        srcSet={creativeWallSrcSet(src)}
        sizes="(max-width: 960px) 100vw, 33vw"
        alt=""
        className="sb-board-art-slot__img"
        draggable={false}
      />
    </div>
  );
}
