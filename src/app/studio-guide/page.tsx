import StudioGuideLegacyRedirect from "@/components/studio-guide/StudioGuideLegacyRedirect";
import "../mobile-route-fixes.css";

/** Legacy route — redirects to Discovery or Project Summary based on plan state. */
export default function StudioGuidePage() {
  return <StudioGuideLegacyRedirect />;
}
