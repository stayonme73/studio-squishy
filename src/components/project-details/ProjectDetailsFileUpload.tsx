"use client";

import type { ChangeEvent } from "react";

import type { ProjectDetailsFileCategory, ProjectDetailsUploadedFile } from "@/config/project-details";
import { projectDetails } from "@/config/project-details";
import {
  PROJECT_DETAILS_MAX_FILE_BYTES,
  removeProjectDetailsFile,
  uploadProjectDetailsFile,
} from "@/lib/project-details-upload";

type Props = {
  campaignId: string;
  files: readonly ProjectDetailsUploadedFile[];
  onFilesChange: (files: ProjectDetailsUploadedFile[]) => void;
  categories?: readonly ProjectDetailsFileCategory[];
  error?: string | null;
};

const DEFAULT_CATEGORIES: ProjectDetailsFileCategory[] = [
  "logo",
  "photos",
  "graphics",
  "brand-materials",
];

export default function ProjectDetailsFileUpload({
  campaignId,
  files,
  onFilesChange,
  categories = DEFAULT_CATEGORIES,
  error,
}: Props) {
  async function handleChange(event: ChangeEvent<HTMLInputElement>, category: ProjectDetailsFileCategory) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;

    if (selected.size > PROJECT_DETAILS_MAX_FILE_BYTES) {
      window.alert("File is too large. Maximum size is 5 MB.");
      return;
    }

    try {
      const uploaded = await uploadProjectDetailsFile(campaignId, selected, category);
      onFilesChange([...files, uploaded]);
    } catch {
      window.alert("Upload failed. Please try again.");
    }
  }

  function handleRemove(fileId: string) {
    removeProjectDetailsFile(campaignId, fileId);
    onFilesChange(files.filter((file) => file.id !== fileId));
  }

  return (
    <div className="pd-upload">
      <p className="pd-field__label">{projectDetails.fields.brandUploads.label}</p>
      <div className="pd-upload__pickers">
        {categories.map((category) => (
          <label key={category} className="pd-upload__picker utility-btn utility-btn--secondary">
            <span>{projectDetails.fileCategories[category]}</span>
            <input
              type="file"
              className="pd-upload__input"
              accept="image/*,.pdf,.doc,.docx,.txt,.mp3,.wav,.mp4"
              onChange={(event) => handleChange(event, category)}
            />
          </label>
        ))}
      </div>

      {error ? <p className="pd-field__error">{error}</p> : null}

      {files.length > 0 ? (
        <ul className="pd-upload__list">
          {files.map((file) => (
            <li key={file.id} className="pd-upload__item">
              <span className="pd-upload__item-name">
                {projectDetails.fileCategories[file.category]} — {file.fileName}
              </span>
              <button
                type="button"
                className="utility-btn utility-btn--ghost pd-upload__remove"
                onClick={() => handleRemove(file.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pd-muted">No files uploaded yet.</p>
      )}
    </div>
  );
}
