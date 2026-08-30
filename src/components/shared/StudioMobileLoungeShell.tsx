import type { ReactNode } from "react";

import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";

type Props = {
  className: string;
  children: ReactNode;
};

/** Customer auth / handoff pages: Mobile spine + Lounge plate. Desktop tokens stay on global roots. */
export default function StudioMobileLoungeShell({ className, children }: Props) {
  return (
    <main className={className} data-mobile-customer-spine="">
      <div className="studio-utility-scene">
        <StudioUtilityBackdrop />
        <div className="studio-utility-scene__content">{children}</div>
      </div>
    </main>
  );
}
