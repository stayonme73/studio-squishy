"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  builderCopyForPackage,
  condensedBuilderSections,
  getConvertedPackageDetail,
  isPublicLaunchPackageId,
  packageDetailPath,
  resolveCondensedPackageId,
  RETIRED_CREATIVE_QA_PURCHASE_MESSAGE,
  supportOptionsForPackage,
  studioCustomerJourneyCondenseV1,
  type CondensedBuilderSectionId,
} from "@/config/studio-customer-journey-condense-v1";
import styles from "@/components/studio-conversation-room/guide/conversation-activity-panel.module.css";
import {
  applyPackageIdentity,
  chooseStudioExtra,
  emptyCondensedJourneyDraft,
  removeStudioExtra,
  selectedStudioExtras,
  isSectionComplete,
  markSectionComplete,
  readCondensedJourneyDraft,
  requiredBuilderReady,
  writeCondensedJourneyDraft,
  type CondensedAboutProject,
  type CondensedJourneyDraft,
} from "@/lib/studio-customer-journey-condense/draft";
import {
  studioExtrasCustomerCopy,
  studioExtrasSelectionCountLabel,
  studioExtrasV1,
} from "@/config/studio-extras-v1";

import { BuilderGlyph } from "./builder-glyph";
import JourneyPageChrome, { AskStudioVoiceButton } from "./JourneyPageChrome";

function RequirementMark({ required }: { required: boolean }) {
  return (
    <span className={required ? "studio-build__required" : "studio-build__optional"}>
      {required ? "Required" : "Optional"}
    </span>
  );
}

function projectAnswersFromForm(data: FormData): CondensedAboutProject {
  return {
    purpose: String(data.get("purpose") ?? ""),
    context: String(data.get("context") ?? ""),
    cta: String(data.get("cta") ?? ""),
    facts: String(data.get("facts") ?? ""),
    assets: String(data.get("assets") ?? ""),
    rights: data.get("rights") === "on",
    qualifyingSource: data.get("qualifyingSource") === "on",
    intelligible: data.get("intelligible") === "on",
    markedMoments: data.get("markedMoments") === "on",
    usableFootage: data.get("usableFootage") === "on",
  };
}

function sectionSummary(draft: CondensedJourneyDraft, id: CondensedBuilderSectionId): string {
  const copy = builderCopyForPackage(draft.packageId);
  if (id === "about-you") {
    const parts = [draft.aboutYou.name, draft.aboutYou.email, draft.aboutYou.company].filter(
      (value) => value.trim(),
    );
    return parts.join(" · ") || condensedBuilderSections[0].summaryEmpty;
  }
  if (id === "about-project") {
    return draft.aboutProject.purpose.trim() || copy.aboutProject.summaryEmpty;
  }
  if (id === "upload") {
    return draft.upload.materials.trim() || copy.upload.summaryEmpty;
  }
  if (id === "preferences") {
    if (draft.preferences.studioDecide) {
      return "The Studio will decide within the original package scope.";
    }
    const parts = [draft.preferences.mustKeep, draft.preferences.mustNotInclude].filter((value) =>
      value.trim(),
    );
    return parts.join(" · ") || copy.preferences.summaryEmpty;
  }
  const selected = supportOptionsForPackage(draft.packageId)
    .filter((option) => draft.support[option.id] === "SELECT")
    .map((option) => option.label);
  if (selected.length) return selected.join(" · ");
  const skipped = supportOptionsForPackage(draft.packageId).every(
    (option) => draft.support[option.id] === "SKIP",
  );
  return skipped ? "No Studio Extras selected." : condensedBuilderSections[4].summaryEmpty;
}

export default function BuildYourProjectPage() {
  const router = useRouter();
  const copy = studioCustomerJourneyCondenseV1;
  const [draft, setDraft] = useState<CondensedJourneyDraft>(() =>
    emptyCondensedJourneyDraft(),
  );
  const [openSection, setOpenSection] = useState<CondensedBuilderSectionId | null>(
    "about-you",
  );
  const selectedPackage =
    getConvertedPackageDetail(draft.packageId) ??
    getConvertedPackageDetail("clip_repurposing");
  const builderCopy = builderCopyForPackage(draft.packageId);
  const purchaseOpen = isPublicLaunchPackageId(draft.packageId);
  const supportOptions = supportOptionsForPackage(draft.packageId);
  const selectedExtraIds = selectedStudioExtras(draft);
  const extrasAtLimit = selectedExtraIds.length >= studioExtrasV1.maxSelectionsPerOrder;

  useEffect(() => {
    const stored = readCondensedJourneyDraft();
    const fromQuery = new URLSearchParams(window.location.search).get("package");
    const nextPackage = fromQuery
      ? resolveCondensedPackageId(fromQuery)
      : stored.packageId;
    const next = writeCondensedJourneyDraft(applyPackageIdentity(stored, nextPackage));
    setDraft(next);
    const hash = window.location.hash.replace("#", "");
    const hashed = condensedBuilderSections.find((section) => section.id === hash);
    const firstOpen = condensedBuilderSections.find(
      (section) => !next.completedSections.includes(section.id),
    );
    setOpenSection(hashed?.id ?? firstOpen?.id ?? "about-you");
  }, []);

  const ready = useMemo(() => (draft ? requiredBuilderReady(draft) : false), [draft]);

  function update(next: CondensedJourneyDraft) {
    setDraft(writeCondensedJourneyDraft(next));
  }

  function draftFromOpenForm(
    id: CondensedBuilderSectionId,
    current: CondensedJourneyDraft,
  ): CondensedJourneyDraft {
    const form = document.querySelector<HTMLFormElement>(
      `[data-builder-section="${id}"] form`,
    );
    if (!form) return current;
    const data = new FormData(form);
    if (id === "about-you") {
      return {
        ...current,
        aboutYou: {
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          company: String(data.get("company") ?? ""),
        },
      };
    }
    if (id === "about-project") {
      const answers = projectAnswersFromForm(data);
      return {
        ...current,
        aboutProject:
          current.packageId && isPublicLaunchPackageId(current.packageId)
            ? {
                ...current.aboutProject,
                purpose: String(data.get("purpose") ?? current.aboutProject.purpose),
              }
            : {
                ...answers,
                cta: data.has("cta") ? answers.cta : current.aboutProject.cta,
              },
      };
    }
    if (id === "upload") {
      return {
        ...current,
        upload: { materials: String(data.get("materials") ?? "") },
      };
    }
    if (id === "preferences") {
      return {
        ...current,
        aboutProject:
          current.packageId === "clip_repurposing"
            ? { ...current.aboutProject, cta: String(data.get("cta") ?? "") }
            : current.aboutProject,
        preferences: {
          mustKeep: String(data.get("mustKeep") ?? ""),
          mustNotInclude: String(data.get("mustNotInclude") ?? ""),
          studioDecide: data.get("studioDecide") === "on",
        },
      };
    }
    return current;
  }

  function openSectionSafely(nextId: CondensedBuilderSectionId | null) {
    const flushed = openSection ? draftFromOpenForm(openSection, draft) : draft;
    if (flushed !== draft) update(flushed);
    setOpenSection(nextId);
  }

  function saveSection(
    id: CondensedBuilderSectionId,
    nextDraft: CondensedJourneyDraft = draft,
  ) {
    const next = markSectionComplete(nextDraft, id);
    setDraft(next);
    const following = condensedBuilderSections.find(
      (section) => !next.completedSections.includes(section.id),
    );
    setOpenSection(following?.id ?? null);
  }

  function goToReview() {
    const flushed = openSection ? draftFromOpenForm(openSection, draft) : draft;
    const next = writeCondensedJourneyDraft(flushed);
    setDraft(next);
    if (!requiredBuilderReady(next)) return;
    if (!isPublicLaunchPackageId(next.packageId)) return;
    router.push(copy.routes.reviewAndPay);
  }

  return (
    <JourneyPageChrome page="build-your-project">
        <style>{`
          html:has(.studio-environment-app) .studio-homepage.studio-journey[data-journey-page="build-your-project"] .studio-homepage__card {
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
          }
          @media (prefers-reduced-motion: reduce) {
            html:has(.studio-environment-app) .studio-homepage.studio-journey[data-journey-page="build-your-project"] .studio-homepage__card {
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
            }
          }
        `}</style>
      <section className="studio-homepage__section">
        <div className="studio-homepage__inner">
          <Link
            href={
              selectedPackage && isPublicLaunchPackageId(selectedPackage.id)
                ? packageDetailPath(selectedPackage.id)
                : copy.routes.home
            }
            className="studio-homepage__card-link studio-journey__back"
          >
            ← Back to Package Detail
          </Link>
          <p className="studio-homepage__kicker">Build Your Project</p>
          <h1
            className="studio-homepage__section-title"
            data-selected-package={selectedPackage?.id}
            data-selected-price={selectedPackage?.priceDisplay}
          >
            {selectedPackage?.name ?? "Build Your Project"}
          </h1>
          <p className="studio-journey__price">{selectedPackage?.priceDisplay}</p>
          <p className="studio-homepage__card-detail">
            Open each section and add what The Studio needs. You can review everything before
            checkout.
          </p>
          {purchaseOpen ? null : (
            <p className="studio-journey__lead" role="status">
              {RETIRED_CREATIVE_QA_PURCHASE_MESSAGE}
            </p>
          )}
          <div className="studio-journey__tiles">
            {condensedBuilderSections.filter((section) =>
              draft.packageId && isPublicLaunchPackageId(draft.packageId)
                ? section.id !== "upload" && section.id !== "preferences"
                : true,
            ).map((section) => {
              const open = openSection === section.id;
              const complete = draft.completedSections.includes(section.id);
              return (
                <article
                  key={section.id}
                  id={section.id}
                  className="studio-homepage__card"
                  data-builder-section={section.id}
                  data-complete={complete ? "true" : "false"}
                  data-open={open ? "true" : "false"}
                >
                  <div className="studio-journey__tile-head">
                    <h3>
                      {complete ? <BuilderGlyph name="complete" size={24} /> : null}
                      <span>{section.title}</span>
                    </h3>
                    <button
                      type="button"
                      className="studio-homepage__card-link studio-build__toggle"
                      aria-expanded={open}
                      onClick={() => openSectionSafely(open ? null : section.id)}
                    >
                      <BuilderGlyph name={open ? "collapse" : "expand"} size={24} />
                      <span>{open ? copy.hideDetails : complete ? "Edit" : "Open"}</span>
                    </button>
                  </div>
                  {open ? null : (
                    <p
                      className={
                        section.id === "upload" && !draft.upload.materials.trim()
                          ? "studio-journey__materials-summary"
                          : undefined
                      }
                    >
                      {sectionSummary(draft, section.id)}
                    </p>
                  )}
                  {open && section.id === "about-you" ? (
                    <form
                      className="studio-journey__fields"
                      method="post"
                      action="#about-you"
                      onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const data = new FormData(event.currentTarget);
                        const next = writeCondensedJourneyDraft({
                          ...draft,
                          aboutYou: {
                            name: String(data.get("name") ?? ""),
                            email: String(data.get("email") ?? ""),
                            company: String(data.get("company") ?? ""),
                          },
                        });
                        saveSection("about-you", next);
                      }}
                    >
                      <div data-builder-field="required">
                        <h3 id="builder-name-label">
                          Your name <RequirementMark required />
                        </h3>
                        <input
                          id="builder-name"
                          name="name"
                          required
                          aria-labelledby="builder-name-label"
                          className={styles.intakeTypeLine}
                          defaultValue={draft.aboutYou.name}
                        />
                      </div>
                      <div data-builder-field="required">
                        <h3 id="builder-email-label">
                          Email <RequirementMark required />
                        </h3>
                        <input
                          id="builder-email"
                          name="email"
                          type="email"
                          required
                          aria-labelledby="builder-email-label"
                          className={styles.intakeTypeLine}
                          defaultValue={draft.aboutYou.email}
                        />
                      </div>
                      <div data-builder-field="optional">
                        <h3 id="builder-company-label">
                          Company name <RequirementMark required={false} />
                        </h3>
                        <input
                          id="builder-company"
                          name="company"
                          aria-labelledby="builder-company-label"
                          className={styles.intakeTypeLine}
                          defaultValue={draft.aboutYou.company}
                        />
                      </div>
                      <button type="submit" className="studio-homepage__btn-primary studio-build__action">
                        <>
              <BuilderGlyph name="continue" size={24} />
              <span>{copy.saveAndContinue}</span>
            </>
                      </button>
                    </form>
                  ) : null}
                  {open && section.id === "about-project" ? (
                    <form
                      className="studio-journey__fields"
                      method="post"
                      action="#about-project"
                      onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const data = new FormData(event.currentTarget);
                        const answers = projectAnswersFromForm(data);
                        const next = writeCondensedJourneyDraft({
                          ...draft,
                          aboutProject:
                            draft.packageId && isPublicLaunchPackageId(draft.packageId)
                              ? {
                                  ...draft.aboutProject,
                                  purpose: String(data.get("purpose") ?? draft.aboutProject.purpose),
                                }
                              : {
                                  ...answers,
                                  cta: data.has("cta") ? answers.cta : draft.aboutProject.cta,
                                },
                        });
                        saveSection("about-project", next);
                      }}
                    >
                      {builderCopy.aboutProject.fields.filter((field) =>
                        draft.packageId && isPublicLaunchPackageId(draft.packageId) ? field.name === "purpose" : true,
                      ).map((field) =>
                        field.kind === "textarea" ? (
                          <div key={field.name} data-builder-field={field.required ? "required" : "optional"}>
                            <h3 id={`builder-${field.name}-label`}>
                              {field.label} <RequirementMark required={field.required} />
                            </h3>
                            <textarea
                              id={`builder-${field.name}`}
                              name={field.name}
                              required={field.required}
                              aria-labelledby={`builder-${field.name}-label`}
                              className={styles.intakeTypeLine}
                              rows={field.rows ?? 2}
                              placeholder={field.placeholder}
                              defaultValue={String(
                                draft.aboutProject[
                                  field.name as keyof CondensedAboutProject
                                ] ?? "",
                              )}
                            />
                          </div>
                        ) : (
                          <div
                            key={field.name}
                            className="studio-journey__confirm"
                            data-builder-field={field.required ? "required" : "optional"}
                          >
                            <input
                              id={`builder-${field.name}`}
                              type="checkbox"
                              name={field.name}
                              required={field.required}
                              defaultChecked={Boolean(
                                draft.aboutProject[
                                  field.name as keyof CondensedAboutProject
                                ],
                              )}
                            />
                            <label htmlFor={`builder-${field.name}`}>
                              {field.label} <RequirementMark required={field.required} />
                            </label>
                          </div>
                        )
                      )}
                      <button type="submit" className="studio-homepage__btn-primary studio-build__action">
                        <>
              <BuilderGlyph name="continue" size={24} />
              <span>{copy.saveAndContinue}</span>
            </>
                      </button>
                    </form>
                  ) : null}
                  {open && section.id === "upload" ? (
                    <form
                      className="studio-journey__fields"
                      method="post"
                      action="#upload"
                      onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const data = new FormData(event.currentTarget);
                        const next = writeCondensedJourneyDraft({
                          ...draft,
                          upload: { materials: String(data.get("materials") ?? "") },
                        });
                        saveSection("upload", next);
                      }}
                    >
                      <div data-builder-field="required">
                        <h3
                          className="studio-journey__qualifying"
                          id="builder-materials-label"
                        >
                          {builderCopy.upload.label} <RequirementMark required />
                        </h3>
                        <p className="studio-journey__materials-note">{copy.materialsHere}</p>
                        <textarea
                          id="builder-materials"
                          name="materials"
                          required
                          aria-labelledby="builder-materials-label"
                          className={styles.intakeTypeLine}
                          rows={3}
                          placeholder={builderCopy.upload.placeholder}
                          defaultValue={draft.upload.materials}
                        />
                      </div>
                      <button type="submit" className="studio-homepage__btn-primary studio-build__action">
                        <>
              <BuilderGlyph name="continue" size={24} />
              <span>{copy.saveAndContinue}</span>
            </>
                      </button>
                    </form>
                  ) : null}
                  {open && section.id === "preferences" ? (
                    <form
                      className="studio-journey__fields"
                      method="post"
                      action="#preferences"
                      onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const data = new FormData(event.currentTarget);
                        const next = writeCondensedJourneyDraft({
                          ...draft,
                          aboutProject:
                            draft.packageId === "clip_repurposing"
                              ? {
                                  ...draft.aboutProject,
                                  cta: String(data.get("cta") ?? ""),
                                }
                              : draft.aboutProject,
                          preferences: {
                            mustKeep: String(data.get("mustKeep") ?? ""),
                            mustNotInclude: String(data.get("mustNotInclude") ?? ""),
                            studioDecide: data.get("studioDecide") === "on",
                          },
                        });
                        saveSection("preferences", next);
                      }}
                    >
                      {draft.packageId === "clip_repurposing" ? (
                        <div data-builder-field="optional">
                          <h3 id="builder-cta-label">
                            Call-to-action wording, if you have one <RequirementMark required={false} />
                          </h3>
                          <textarea
                            id="builder-cta"
                            name="cta"
                            aria-labelledby="builder-cta-label"
                            className={styles.intakeTypeLine}
                            rows={2}
                            placeholder="Example: Book online or call."
                            defaultValue={draft.aboutProject.cta}
                          />
                        </div>
                      ) : null}
                      <div data-builder-field="optional">
                        <h3 id="builder-must-keep-label">
                          {builderCopy.preferences.mustKeep} <RequirementMark required={false} />
                        </h3>
                        <textarea
                          id="builder-must-keep"
                          name="mustKeep"
                          aria-labelledby="builder-must-keep-label"
                          className={styles.intakeTypeLine}
                          rows={2}
                          defaultValue={draft.preferences.mustKeep}
                        />
                      </div>
                      <div data-builder-field="optional">
                        <h3 id="builder-must-not-label">
                          {builderCopy.preferences.mustNot} <RequirementMark required={false} />
                        </h3>
                        <textarea
                          id="builder-must-not"
                          name="mustNotInclude"
                          aria-labelledby="builder-must-not-label"
                          className={styles.intakeTypeLine}
                          rows={2}
                          defaultValue={draft.preferences.mustNotInclude}
                        />
                      </div>
                      <div className="studio-journey__confirm" data-builder-field="optional">
                        <input
                          id="builder-studio-decide"
                          type="checkbox"
                          name="studioDecide"
                          defaultChecked={draft.preferences.studioDecide}
                        />
                        <label htmlFor="builder-studio-decide">
                          {builderCopy.preferences.studioDecide} <RequirementMark required={false} />
                        </label>
                      </div>
                      <button type="submit" className="studio-homepage__btn-primary studio-build__action">
                        <>
              <BuilderGlyph name="continue" size={24} />
              <span>{copy.saveAndContinue}</span>
            </>
                      </button>
                    </form>
                  ) : null}
                  {open && section.id === "support" ? (
                    <div className="studio-journey__fields">
                      <div className="studio-journey__included-list">
                        <p id="builder-extras-instruction" className="studio-journey__included">
                          {studioExtrasCustomerCopy.builderInstruction}
                        </p>
                        <p
                          id="builder-extras-count"
                          className="studio-journey__included"
                          role="status"
                          aria-live="polite"
                          data-extras-count={selectedExtraIds.length}
                        >
                          {studioExtrasSelectionCountLabel(selectedExtraIds.length)}
                        </p>
                        {studioExtrasCustomerCopy.builderPromise.map((sentence) => (
                          <p key={sentence} className="studio-journey__included">
                            {sentence}
                          </p>
                        ))}
                      </div>
                      <div
                        className="studio-journey__support"
                        role="group"
                        aria-labelledby="builder-extras-instruction builder-extras-count"
                      >
                        {supportOptions.map((option) => {
                          const selected = draft.support[option.id] === "SELECT";
                          const skipped = draft.support[option.id] === "SKIP";
                          const blocked = extrasAtLimit && !selected;
                          return (
                            <div
                              key={option.id}
                              className="studio-journey__support-row"
                              data-support-id={option.id}
                              data-extras-selected={selected ? "true" : "false"}
                              data-extras-blocked={blocked ? "true" : "false"}
                              aria-disabled={blocked ? true : undefined}
                            >
                              <div>
                                <p id={`builder-extra-${option.id}`}>{option.label}</p>
                                <p className="studio-journey__support-detail">{option.detail}</p>
                              </div>
                              <div className="studio-journey__choices" role="group" aria-labelledby={`builder-extra-${option.id}`}>
                                <button
                                  type="button"
                                  className="studio-homepage__card-link"
                                  data-selected={selected ? "true" : "false"}
                                  data-support-id={option.id}
                                  data-extras-action="add"
                                  aria-pressed={selected}
                                  disabled={blocked}
                                  aria-describedby={blocked ? "builder-extras-limit" : undefined}
                                  onClick={() => update(chooseStudioExtra(draft, option.id, "SELECT"))}
                                >
                                  Add
                                </button>
                                {selected ? (
                                  <button
                                    type="button"
                                    className="studio-homepage__card-link"
                                    data-support-id={option.id}
                                    data-extras-action="remove"
                                    aria-label={`${studioExtrasCustomerCopy.builderRemove} ${option.label}`}
                                    onClick={() => update(removeStudioExtra(draft, option.id))}
                                  >
                                    {studioExtrasCustomerCopy.builderRemove}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="studio-homepage__card-link"
                                    data-selected={skipped ? "true" : "false"}
                                    data-support-id={option.id}
                                    data-extras-action="skip"
                                    aria-pressed={skipped}
                                    disabled={blocked}
                                    aria-describedby={blocked ? "builder-extras-limit" : undefined}
                                    onClick={() => update(chooseStudioExtra(draft, option.id, "SKIP"))}
                                  >
                                    Skip
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {extrasAtLimit ? (
                        <p id="builder-extras-limit" className="studio-journey__included" role="status">
                          {studioExtrasCustomerCopy.builderLimitReached}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        className="studio-homepage__btn-primary studio-build__action"
                        disabled={!isSectionComplete(draft, "support")}
                        onClick={() => saveSection("support")}
                      >
                        <>
              <BuilderGlyph name="continue" size={24} />
              <span>{copy.saveAndContinue}</span>
            </>
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
          <div className="studio-journey__actions">
            <button
              type="button"
              className="studio-homepage__btn-primary studio-build__action studio-build__action--main"
              disabled={!ready || !purchaseOpen}
              data-builder-cta="review"
              onClick={goToReview}
            >
              <BuilderGlyph name="continue" size={28} />
              <span>{copy.continueToReview}</span>
            </button>
            <AskStudioVoiceButton
              label={copy.askStudioVoice}
              className="studio-homepage__btn-secondary studio-build__toggle"
              icon={<BuilderGlyph name="help" size={24} />}
            />
          </div>
        </div>
      </section>
    </JourneyPageChrome>
  );
}
