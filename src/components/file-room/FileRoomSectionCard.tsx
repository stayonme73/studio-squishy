import type { ReactNode } from "react";

type FileRoomSectionCardProps = {
  title: string;
  children: ReactNode;
};

export default function FileRoomSectionCard({ title, children }: FileRoomSectionCardProps) {
  return (
    <section className="utility-card">
      <h2 className="fr-section-title">{title}</h2>
      {children}
    </section>
  );
}
