"use client";

import { welcomeHallV3 } from "@/config/welcome-hall-v3-direction";

type Props = {
  faceIndex: number;
  onFaceChange: (index: number) => void;
};

const FACE_ACCENTS = [
  "linear-gradient(180deg, #0d9488 0%, #4f46e5 100%)",
  "linear-gradient(180deg, #db2777 0%, #7c3aed 100%)",
  "linear-gradient(180deg, #0891b2 0%, #2563eb 100%)",
  "linear-gradient(180deg, #0e7490 0%, #475569 100%)",
] as const;

/** Single-face selector dial — no CSS 3D (avoids mirrored/broken faces in browser). */
export default function ShowroomTower({ faceIndex, onFaceChange }: Props) {
  const count = welcomeHallV3.towerFaces.length;
  const face = welcomeHallV3.towerFaces[faceIndex];
  const prev = () => onFaceChange((faceIndex + count - 1) % count);
  const next = () => onFaceChange((faceIndex + 1) % count);

  return (
    <div className="showroom-tower" aria-label="Service category selector">
      <div className="showroom-tower-shell">
        <button type="button" className="showroom-tower-nav" onClick={prev} aria-label="Previous category">
          ‹
        </button>

        <button
          type="button"
          className="showroom-tower-face-card"
          style={{ background: FACE_ACCENTS[faceIndex] }}
          onClick={next}
          aria-label={`Selected category: ${face.label}. Tap to rotate.`}
        >
          <span className="showroom-tower-face-label">{face.label}</span>
          <span className="showroom-tower-face-hint">Tap or use arrows</span>
        </button>

        <button type="button" className="showroom-tower-nav" onClick={next} aria-label="Next category">
          ›
        </button>
      </div>

      <div className="showroom-tower-dots" role="tablist" aria-label="Categories">
        {welcomeHallV3.towerFaces.map((f, i) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={i === faceIndex}
            aria-label={f.label}
            className={`showroom-tower-dot${i === faceIndex ? " showroom-tower-dot--active" : ""}`}
            onClick={() => onFaceChange(i)}
          />
        ))}
      </div>

      <div className="showroom-tower-base" aria-hidden />
    </div>
  );
}
