import OwnerQaPanel from "@/components/dev/OwnerQaPanel";
import { isDevToolsEnabled } from "@/lib/dev-tools-enabled";

/** Owner QA nav — development mode only (NEXT_PUBLIC_DEV_TOOLS=1). */
export default function OwnerQaRoot() {
  if (!isDevToolsEnabled()) return null;
  return <OwnerQaPanel />;
}