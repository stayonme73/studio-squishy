"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import PackageComparisonTable from "@/components/shared/PackageComparisonTable";
import HelpMeChooseModal from "@/components/studio-guide/HelpMeChooseModal";
import PackageDetailPanel from "@/components/studio-guide/PackageDetailPanel";
import PackageSelectorSidebar from "@/components/studio-guide/PackageSelectorSidebar";
import StudioGuideFooter from "@/components/studio-guide/StudioGuideFooter";
import { paymentHref, studioGuide, type StudioGuidePackageId } from "@/config/studio-guide";
import { helpCenterHref } from "@/config/help-center";
import { packageIndexForId } from "@/lib/recommendPackage";

/**
 * Studio Guide — choose a package or use Help Me Choose.
 */
export default function StudioGuideScene() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromHall = searchParams.get("from") === "hall";
  const [packageIndex, setPackageIndex] = useState(0);
  const [entering, setEntering] = useState(fromHall);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const selected = studioGuide.packages[packageIndex];

  useEffect(() => {
    if (!fromHall) return;
    const timer = window.setTimeout(() => setEntering(false), 900);
    return () => window.clearTimeout(timer);
  }, [fromHall]);

  const goToPayment = useCallback(() => {
    router.push(paymentHref(selected.id));
  }, [router, selected.id]);

  const handleRecommended = useCallback((packageId: StudioGuidePackageId) => {
    setPackageIndex(packageIndexForId(packageId));
  }, []);

  return (
    <div
      className={`studio-guide${entering ? " studio-guide--entering" : ""}`}
      aria-label="Studio Guide"
    >
      <header className="guide-header">
        <p className="guide-header-eyebrow">{studioGuide.title}</p>
        <h1 className="guide-header-title">{studioGuide.subtitle}</h1>
        <p className="guide-header-line">{studioGuide.headerLine}</p>
      </header>

      <div className="guide-stage">
        <PackageSelectorSidebar
          packageIndex={packageIndex}
          onPackageChange={setPackageIndex}
          onHelpClick={() => setHelpModalOpen(true)}
        />
        <PackageDetailPanel packageIndex={packageIndex} onCtaClick={goToPayment} />
      </div>

      <section className="guide-compare utility-card" aria-labelledby="guide-compare-title">
        <PackageComparisonTable />
        <p className="guide-compare__help">
          <Link href={helpCenterHref("packages", "studio-board")} className="guide-compare__link">
            Full package details in Help Center →
          </Link>
        </p>
      </section>

      <StudioGuideFooter />

      <HelpMeChooseModal
        open={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        onRecommended={handleRecommended}
      />
    </div>
  );
}
