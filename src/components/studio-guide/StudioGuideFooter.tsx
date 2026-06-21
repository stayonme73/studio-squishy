import { studioGuide } from "@/config/studio-guide";

import { BackArrowIcon } from "./PackageIcons";

type Props = {
  backHref?: string;
  backLabel?: string;
};

export default function StudioGuideFooter({
  backHref = studioGuide.footer.backHref,
  backLabel = studioGuide.footer.backLabel,
}: Props) {
  return (
    <footer className="guide-footer guide-footer--simple">
      <a href={backHref} className="guide-footer-back">
        <BackArrowIcon className="guide-footer-back-icon" />
        {backLabel}
      </a>
    </footer>
  );
}
