import { welcomeHallCopy } from "@/config/welcome-hall-copy";

/**
 * Digital Art Prism — rotating creative beacon with visible digital faces.
 */
export default function ArtPrism() {
  return (
    <div className="art-prism" aria-label={welcomeHallCopy.artPrism.label}>
      <div className="art-prism-halo" aria-hidden />
      <div className="art-prism-base" aria-hidden />
      <div className="art-prism-stage">
        <div className="art-prism-tower" aria-hidden>
          <div className="art-prism-face art-prism-face--front">
            <div className="art-prism-screen">
              <div className="art-prism-art art-prism-art--urban" />
              <div className="art-prism-scanline" />
            </div>
          </div>
          <div className="art-prism-face art-prism-face--back">
            <div className="art-prism-screen">
              <div className="art-prism-art art-prism-art--colorburst" />
              <div className="art-prism-scanline" />
            </div>
          </div>
          <div className="art-prism-face art-prism-face--left">
            <div className="art-prism-screen">
              <div className="art-prism-art art-prism-art--geometry" />
              <div className="art-prism-scanline" />
            </div>
          </div>
          <div className="art-prism-face art-prism-face--right">
            <div className="art-prism-screen">
              <div className="art-prism-art art-prism-art--motion" />
              <div className="art-prism-scanline" />
            </div>
          </div>
          <div className="art-prism-edge art-prism-edge--front" />
          <div className="art-prism-edge art-prism-edge--back" />
        </div>
        <div className="art-prism-glow" aria-hidden />
        <div className="art-prism-floor-pool" aria-hidden />
      </div>
      <div className="art-prism-spotlight" aria-hidden />
    </div>
  );
}
