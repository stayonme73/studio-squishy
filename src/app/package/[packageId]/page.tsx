import { notFound } from "next/navigation";

import PackageDetailPage from "@/components/studio-journey/PackageDetailPage";
import {
  getConvertedPackageDetail,
  packageIdFromSlug,
} from "@/config/studio-customer-journey-condense-v1";

import "../../studio-customer-last-paint.css";

type PackageDetailRouteProps = {
  params: Promise<{ packageId: string }>;
};

export default async function PackageDetailRoute({ params }: PackageDetailRouteProps) {
  const { packageId } = await params;
  const id = packageIdFromSlug(packageId);
  const model = getConvertedPackageDetail(id);
  if (!model) notFound();
  return <PackageDetailPage model={model} />;
}
