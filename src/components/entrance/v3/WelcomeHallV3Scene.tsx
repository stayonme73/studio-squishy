"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import ShowroomTower from "@/components/entrance/v3/ShowroomTower";
import ShowroomWall from "@/components/entrance/v3/ShowroomWall";
import StudioGuideKiosk from "@/components/entrance/v3/StudioGuideKiosk";
import StudioGuideDialog from "@/components/entrance/StudioGuideDialog";
import { welcomeHallInteraction } from "@/config/welcome-hall-interaction";
import { welcomeHallScene } from "@/config/welcome-hall-scene";
import { welcomeHallV3 } from "@/config/welcome-hall-v3-direction";

/**
 * Welcome Hall V3 — interactive showroom.
 * @see docs/illustration/welcome-hall-v3-implementation-plan.md
 */
export default function WelcomeHallV3Scene() {
  const router = useRouter();
  const [towerFaceIndex, setTowerFaceIndex] = useState(0);
  const [hasExploredShowroom, setHasExploredShowroom] = useState(false);
  const [categorySelected, setCategorySelected] = useState<number | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideRedirect, setGuideRedirect] = useState(false);
  const [guideCategoryIndex, setGuideCategoryIndex] = useState<number | null>(null);
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

  const handleTowerChange = (index: number) => {
    setTowerFaceIndex(index);
    setCategorySelected(index);
    setHasExploredShowroom(true);
  };

  const openGuideWithCategory = (index: number) => {
    setGuideRedirect(false);
    setGuideCategoryIndex(index);
    setGuideOpen(true);
  };

  const handleWallCta = () => {
    if (categorySelected !== null) {
      openGuideWithCategory(categorySelected);
    }
  };

  const handleKioskTap = () => {
    if (!hasExploredShowroom || categorySelected === null) {
      setGuideRedirect(true);
      setGuideCategoryIndex(null);
      setGuideOpen(true);
      return;
    }
    openGuideWithCategory(categorySelected);
  };

  const handleDraftIdea = () => {
    navigateAfterTransition(welcomeHallInteraction.routes.draftRoom);
  };

  const handlePlanProject = () => {
    setGuideOpen(false);
    router.push(welcomeHallInteraction.routes.intake);
  };

  const selectedCategory =
    guideCategoryIndex !== null ? welcomeHallV3.towerFaces[guideCategoryIndex] : null;

  return (
    <div className="welcome-hall-static welcome-hall-v3" aria-label="Welcome Hall showroom">
      <div
        className={`welcome-hall-frame welcome-hall-v3-frame${transitioning ? " welcome-hall-frame--transitioning" : ""}`}
      >
        <div className="welcome-hall-v3-hall-zone" aria-hidden>
          {/* Left zone only — WALL + PORTAL, no wasted corner */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={welcomeHallScene.src}
            alt=""
            className="welcome-hall-v3-plate-interim"
            draggable={false}
          />
          <div className="welcome-hall-v3-mask welcome-hall-v3-mask--tower" />
        </div>

        <div className="welcome-hall-v3-ui">
          <ShowroomTower faceIndex={towerFaceIndex} onFaceChange={handleTowerChange} />
          <ShowroomWall categoryIndex={categorySelected} onCtaClick={handleWallCta} />
          <StudioGuideKiosk onTap={handleKioskTap} active={hasExploredShowroom} />
        </div>

        {transitioning && (
          <div className="hall-view-ahead-transition" aria-hidden>
            <div className="hall-view-ahead-transition-glow" />
          </div>
        )}
      </div>

      <StudioGuideDialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onDraftIdea={handleDraftIdea}
        onPlanProject={handlePlanProject}
        redirectMessage={guideRedirect ? welcomeHallV3.kiosk.earlyTapMessage : undefined}
        selectedCategoryLabel={selectedCategory?.label}
      />
    </div>
  );
}
