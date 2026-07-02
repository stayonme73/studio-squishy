import { welcomeHallScene } from "@/config/welcome-hall-scene";

/**
 * Studio Lobby environment behind the Route Map hero — same plate as /studio-lobby.
 * @see welcome-hall-scene.ts · welcome-hall-phase1.css
 */
export default function RouteMapLobbyBackdrop() {
  return (
    <div className="route-map-lobby-backdrop" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="route-map-lobby-backdrop__art"
        src={welcomeHallScene.src}
        alt=""
        draggable={false}
      />
      <div className="route-map-lobby-backdrop__veil" />
    </div>
  );
}
