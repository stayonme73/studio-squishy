import OwnerQaPanel from "@/components/dev/OwnerQaPanel";

/** Owner QA nav — always on in local development (includes Reset campaign). */
export default function OwnerQaRoot() {
  if (process.env.NODE_ENV !== "development") return null;
  return <OwnerQaPanel />;
}