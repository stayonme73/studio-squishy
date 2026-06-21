import Link from "next/link";

import { helpCenterHref } from "@/config/help-center";

type Props = {
  label: string;
  anchor?: string;
  from?: "campaign-details" | "studio-board" | "payment";
  className?: string;
};

export default function HelpCenterLink({ label, anchor, from, className }: Props) {
  return (
    <p className={className ?? "utility-help-link"}>
      <Link href={helpCenterHref(anchor, from)} className="utility-help-link__a">
        {label} →
      </Link>
    </p>
  );
}
