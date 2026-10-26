import StudioHomepageLobbyRoute from "@/components/studio-homepage/StudioHomepageLobbyRoute";

import "../studio-customer-last-paint.css";

type StudioLobbyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Approved homepage is the public front door. Same page as `/`. */
export default function StudioLobbyPage({
  searchParams,
}: StudioLobbyPageProps) {
  return <StudioHomepageLobbyRoute searchParams={searchParams} />;
}
