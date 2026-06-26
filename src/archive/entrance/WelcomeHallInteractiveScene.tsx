"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import StudioGuideDialog from "@/archive/entrance/StudioGuideDialog";
import { welcomeHallInteraction } from "@/config/welcome-hall-interaction";
import { welcomeHallScene } from "@/config/welcome-hall-scene";

/**
 * Welcome Hall — locked artwork + interaction pass (FINAL ART DIRECTION).
 * Studio Guide box · View Ahead transition on Start Drafting.
 * @see welcome-hall-direction.ts
 */
export default function WelcomeHallInteractiveScene() {
  const router = useRouter();
  const [guideOpen, setGuideOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const navigateAfterTransition = useCallback(
    (path: string) => {
      setGuideOpen(false);
      setTransitioning(true);
      window.setTimeout(() => {
        router.push(path);
      }, welcomeHallInteraction.transitionMs);
    },
    [router],
  );

  const handleDraftIdea = () => {
    navigateAfterTransition(welcomeHallInteraction.routes.draftRoom);
  };

  const handlePlanProject = () => {
    setGuideOpen(false);
    router.push(welcomeHallInteraction.routes.intake);
  };

  return (
    <div className="welcome-hall-static" aria-label="Welcome Hall entrance">
      <div
        className={`welcome-hall-frame${transitioning ? " welcome-hall-frame--transitioning" : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={welcomeHallScene.src}
          alt={welcomeHallScene.alt}
          className="welcome-hall-static-image"
          draggable={false}
        />

        <div className="welcome-hall-interactions">
          <button
            type="button"
            className="hall-guide-hotspot"
            aria-label="Studio Guide — How can we help?"
            onClick={() => setGuideOpen(true)}
            style={{
              left: welcomeHallScene.guideHotspot.left,
              top: welcomeHallScene.guideHotspot.top,
              width: welcomeHallScene.guideHotspot.width,
              height: welcomeHallScene.guideHotspot.height,
            }}
          />

          {transitioning && (
            <div className="hall-view-ahead-transition" aria-hidden>
              <div className="hall-view-ahead-transition-glow" />
            </div>
          )}
        </div>
      </div>

      <StudioGuideDialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onDraftIdea={handleDraftIdea}
        onPlanProject={handlePlanProject}
      />
    </div>
  );
}
