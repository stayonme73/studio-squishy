import { welcomeHallScene } from "@/config/welcome-hall-scene";

/**
 * Permanent Studio environment — Lounge + veil + shared frost.
 * Frost lives in this shell, behind interactive content.
 * Pointer-events none. Pages must not paint a second Lounge.
 */
export default function StudioEnvironmentShell() {
  return (
    <div
      className="studio-environment-shell"
      data-studio-environment-shell=""
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="studio-environment-shell__plate"
        src={welcomeHallScene.src}
        alt=""
        draggable={false}
      />
      <div className="studio-environment-shell__veil" />
      <div
        className="studio-environment-shell__frost"
        data-studio-environment-frost=""
      />
    </div>
  );
}
