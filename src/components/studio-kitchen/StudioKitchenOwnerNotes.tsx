import { studioKitchen } from "@/config/studio-kitchen";

type Props = {
  notes: string[];
};

export default function StudioKitchenOwnerNotes({ notes }: Props) {
  const { detail } = studioKitchen;

  return (
    <section className="sk-notes utility-card" aria-labelledby="sk-owner-notes-title">
      <h2 id="sk-owner-notes-title" className="sk-notes__title">
        {detail.ownerNotesTitle}
      </h2>
      {notes.length === 0 ? (
        <p className="sk-notes__empty">{detail.ownerNotesEmpty}</p>
      ) : (
        <ul className="sk-notes__list">
          {notes.map((note) => (
            <li key={note} className="sk-notes__item">
              {note}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
