import AccessControlDeniedPanel from "@/components/shared/AccessControlDeniedPanel";
import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
import { isAccessControlDeniedRoomId, type AccessControlDeniedRoomId } from "@/config/access-control";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

export const metadata = {
  title: "Access Denied",
};

type AccessDeniedPageProps = {
  searchParams: Promise<{ room?: string }>;
};

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const params = await searchParams;
  const room: AccessControlDeniedRoomId = isAccessControlDeniedRoomId(params.room)
    ? params.room
    : "customer";

  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden`}
    >
      <div className="studio-utility-scene studio-utility-scene--access-denied flex min-h-0 flex-1 flex-col overflow-hidden">
        <StudioUtilityBackdrop />
        <div className="studio-utility-scene__content flex min-h-0 flex-1 flex-col overflow-hidden">
          <AccessControlDeniedPanel room={room} />
        </div>
      </div>
    </main>
  );
}
