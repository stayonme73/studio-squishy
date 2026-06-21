/**
 * Package comparison — single source for Help Center + Studio Guide tables.
 * Quotas from studio-guide.ts; timeline, best-for, and billing from v1-lock copy.
 */

import { studioGuide, type StudioGuidePackageId } from "@/config/studio-guide";
import { getStudioGuideV1Package } from "@/config/studio-guide-v1-lock";

export type PackageComparisonColumn = {
  id: StudioGuidePackageId;
  label: string;
};

export type PackageComparisonRow = {
  id: string;
  label: string;
  spark: string;
  momentum: string;
  growth: string;
};

export const packageComparisonColumns: readonly PackageComparisonColumn[] = [
  { id: "spark", label: "SPARK" },
  { id: "momentum", label: "MOMENTUM" },
  { id: "growth", label: "GROWTH" },
];

function quota(packageId: StudioGuidePackageId, quotaId: string): string {
  const pkg = studioGuide.packages.find((entry) => entry.id === packageId);
  const quota = pkg?.deliverableQuotas.find((entry) => entry.id === quotaId);
  if (!quota) return "—";
  return String(quota.total);
}

function v1Field(packageId: StudioGuidePackageId, field: "timeline" | "revisions" | "bestFor" | "price" | "tagline") {
  const pkg = getStudioGuideV1Package(packageId);
  if (!pkg) return "—";
  return pkg[field];
}

export const packageComparisonRows: readonly PackageComparisonRow[] = [
  {
    id: "concepts",
    label: "Campaign concepts",
    spark: quota("spark", "concepts"),
    momentum: `${quota("momentum", "concepts")} / month`,
    growth: quota("growth", "concepts"),
  },
  {
    id: "social",
    label: "Social posts",
    spark: quota("spark", "social"),
    momentum: quota("momentum", "social"),
    growth: quota("growth", "social"),
  },
  {
    id: "emails",
    label: "Marketing emails",
    spark: quota("spark", "emails"),
    momentum: quota("momentum", "emails"),
    growth: quota("growth", "emails"),
  },
  {
    id: "sms",
    label: "SMS messages",
    spark: quota("spark", "sms"),
    momentum: quota("momentum", "sms"),
    growth: quota("growth", "sms"),
  },
  {
    id: "video",
    label: "Video scripts",
    spark: quota("spark", "video"),
    momentum: quota("momentum", "video"),
    growth: quota("growth", "video"),
  },
  {
    id: "calendar",
    label: "Marketing calendar",
    spark: "1",
    momentum: "1 (monthly)",
    growth: "1 (monthly)",
  },
  {
    id: "revisions",
    label: "Revision rounds",
    spark: v1Field("spark", "revisions"),
    momentum: v1Field("momentum", "revisions"),
    growth: v1Field("growth", "revisions"),
  },
  {
    id: "timeline",
    label: "Timeline",
    spark: v1Field("spark", "timeline"),
    momentum: v1Field("momentum", "timeline"),
    growth: v1Field("growth", "timeline"),
  },
  {
    id: "best-for",
    label: "Best for",
    spark: v1Field("spark", "bestFor"),
    momentum: v1Field("momentum", "bestFor"),
    growth: v1Field("growth", "bestFor"),
  },
  {
    id: "billing",
    label: "One-time vs monthly",
    spark: `${v1Field("spark", "tagline")} · ${v1Field("spark", "price")}`,
    momentum: `${v1Field("momentum", "tagline")} · ${v1Field("momentum", "price")}`,
    growth: `${v1Field("growth", "tagline")} · ${v1Field("growth", "price")}`,
  },
];

export const packageComparisonCopy = {
  title: "Compare Packages",
  lead:
    "See what is included with SPARK, MOMENTUM, and GROWTH before you choose. Your selected package locks for the active campaign.",
  note:
    "The Studio creates ready-to-use marketing copy and plans. You send emails, post to social, and run promotions through your own tools.",
} as const;
