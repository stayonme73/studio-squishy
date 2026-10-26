import StudioHomepageLobbyRoute from "@/components/studio-homepage/StudioHomepageLobbyRoute";

import "./studio-customer-last-paint.css";

type StudioLobbyRootPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Approved homepage is the public front door. Same page as `/studio-lobby`. */
export default function StudioLobbyRootPage({
  searchParams,
}: StudioLobbyRootPageProps) {
  return <StudioHomepageLobbyRoute searchParams={searchParams} />;
}
