"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { materialsConfig } from "@/config/materials";
import type { CampaignRecord } from "@/config/studio-board";
import type {
  ClientConsolidatedRequest,
  ClientOptionalRequest,
} from "@/lib/materials/client-requests";
import type { ClientSubmitPayload } from "@/lib/materials/payload-validation";
import type { MaterialCategory, MaterialContentKind } from "@/lib/materials/types";

type MaterialsClientResponse = {
  blockingRequiredCount: number;
  clientIntakeCount?: number;
  consolidatedRequests?: ClientConsolidatedRequest[];
  optionalRequests?: ClientOptionalRequest[];
  syncedAt?: string;
  error?: string;
};

type FileSelectionState = {
  kind: "selected" | "error";
  fileName?: string;
  mimeType?: string;
  previewDataUrl?: string;
  message: string;
};

type BoardMaterialStatus = "Still Needed" | "Received" | "Not Available Yet";

type BoardRequest =
  | { kind: "consolidated"; request: ClientConsolidatedRequest }
  | { kind: "optional"; request: ClientOptionalRequest };

type MaterialActionCard = {
  id: string;
  label: string;
  detail: string;
  status: BoardMaterialStatus;
  request?: BoardRequest;
};

type ReceivedMaterial = {
  id: string;
  label: string;
  value?: string;
  status: Extract<BoardMaterialStatus, "Received" | "Not Available Yet">;
};

type SocialMaterialDefinition = {
  id: string;
  label: string;
  detail: string;
  categories: readonly MaterialCategory[];
  contentKinds?: readonly MaterialContentKind[];
  value?: string;
};

const SOCIAL_POSTS_JOB_ID = "v2-rtu-social-posts";
const MATERIALS_IMAGE_PREVIEW_MAX_BYTES = 5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("File preview failed."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("File preview failed."));
    reader.readAsDataURL(file);
  });
}

function payloadFieldsForKind(contentKind: MaterialContentKind): Array<keyof ClientSubmitPayload> {
  switch (contentKind) {
    case "url":
      return ["url", "note"];
    case "file-metadata":
      return ["fileName", "mimeType", "note"];
    case "confirmation":
    case "text":
    default:
      return ["text", "note"];
  }
}

function fieldLabel(field: keyof ClientSubmitPayload): string {
  switch (field) {
    case "url":
      return "URL";
    case "fileName":
      return "File name or description";
    case "mimeType":
      return "File type (optional)";
    case "text":
      return "Details";
    case "note":
      return "Note (optional)";
    default:
      return field;
  }
}

function formatReceivedStatus(submittedAt: string | undefined): string {
  if (!submittedAt) return "Received";
  const parsed = new Date(submittedAt);
  if (Number.isNaN(parsed.getTime())) return "Received";
  return `Received ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)}`;
}

function textValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function firstText(...values: Array<string | undefined>): string | undefined {
  return values.map(textValue).find(Boolean);
}

function summarizeFiles(campaign: CampaignRecord, categories: readonly string[]): string | undefined {
  const files = campaign.projectDetails?.files.filter((file) => categories.includes(file.category)) ?? [];
  if (files.length === 0) return undefined;
  if (files.length === 1) return files[0]?.fileName;
  return `${files.length} files received`;
}

function summarizeRouteMapIntake(
  answers: NonNullable<CampaignRecord["routeMapIntake"]>["answers"] | undefined,
) {
  return {
    campaignGoal: firstText(answers?.postsAbout, answers?.campaignGoal, answers?.campaignFocus),
    platformFormat: firstText(answers?.platform, answers?.format, answers?.sizeNotes),
    brandMaterials: textValue(answers?.materials),
    exactWording: firstText(answers?.wordingHashtags, answers?.mustInclude, answers?.disclaimers),
    destination: firstText(answers?.callToAction, answers?.destination, answers?.link),
    avoid: firstText(answers?.mustNotSay, answers?.avoid),
  };
}

function isSocialPostsCampaign(campaign: CampaignRecord): boolean {
  if (campaign.routeMapContext?.jobId === SOCIAL_POSTS_JOB_ID) return true;
  return Boolean(
    campaign.approvedStudioPlan?.lineItems.some(
      (lineItem) => (lineItem.skuId ?? lineItem.serviceId) === SOCIAL_POSTS_JOB_ID,
    ),
  );
}

function requestStatus(request: ClientConsolidatedRequest | ClientOptionalRequest): BoardMaterialStatus {
  if (request.isPendingReview || request.reviewStatus === "submitted" || request.reviewStatus === "approved_for_use") {
    return "Received";
  }
  if (request.canSubmit) return "Still Needed";
  return "Not Available Yet";
}

function shouldHideSocialPostsRequest(request: ClientConsolidatedRequest | ClientOptionalRequest): boolean {
  if (request.category === "access-instructions") return true;
  return /describe platform access/i.test("prompt" in request ? request.prompt : request.label);
}

function requestMatchesDefinition(
  request: ClientConsolidatedRequest | ClientOptionalRequest,
  definition: SocialMaterialDefinition,
) {
  if (!definition.categories.includes(request.category)) return false;
  if (!definition.contentKinds) return true;
  return definition.contentKinds.includes(request.contentKind);
}

function resolveReceivedMaterials(campaign: CampaignRecord): ReceivedMaterial[] {
  const routeAnswers = campaign.routeMapIntake?.answers ?? campaign.routeMapIntakeDraft?.answers;
  const intake = summarizeRouteMapIntake(routeAnswers);
  const details = campaign.projectDetails?.form;
  const brandFileSummary = summarizeFiles(campaign, ["logo", "graphics", "brand-materials", "photos"]);

  const received: Array<Omit<ReceivedMaterial, "status">> = [
    {
      id: "campaign-goal",
      label: "Campaign goal",
      value: firstText(intake.campaignGoal, details?.workingOn, details?.mainOffer),
    },
    {
      id: "platform-format",
      label: "Platform/format",
      value: firstText(intake.platformFormat, details?.socialPlatforms, details?.marketingFormats),
    },
    {
      id: "brand-materials",
      label: "Brand materials",
      value: firstText(intake.brandMaterials, brandFileSummary, details?.brandColorsFonts),
    },
    {
      id: "exact-wording",
      label: "Exact wording",
      value: firstText(intake.exactWording, details?.mustIncludeExactly, details?.conceptRequiredWording),
    },
    {
      id: "destination",
      label: "Link or destination",
      value: firstText(intake.destination, details?.destinationLink, details?.callToAction),
    },
  ];

  const avoid = firstText(intake.avoid, details?.brandDoNotUse);
  if (avoid) {
    received.push({
      id: "avoid",
      label: "Anything to avoid",
      value: avoid,
    });
  }

  return received.map((item) => ({
    ...item,
    status: item.value ? "Received" : "Not Available Yet",
  }));
}

function resolveSocialMaterialDefinitions(campaign: CampaignRecord): SocialMaterialDefinition[] {
  const received = resolveReceivedMaterials(campaign);
  const valueFor = (id: string) => received.find((item) => item.id === id)?.value;

  return [
    {
      id: "campaign-message",
      label: "Campaign goal/message",
      detail: "Tell us what the posts should help people understand or do.",
      categories: ["factual-confirmation"],
      value: valueFor("campaign-goal"),
    },
    {
      id: "platform-format",
      label: "Platform/format",
      detail: "Confirm the platform and any size or format notes.",
      categories: [],
      value: valueFor("platform-format"),
    },
    {
      id: "brand-visuals",
      label: "Brand/logo/visual references",
      detail: "Share logos, colors, photos, or visual references we should follow.",
      categories: ["logo-brand", "photo-video"],
      contentKinds: ["file-metadata", "text"],
      value: valueFor("brand-materials"),
    },
    {
      id: "destination-cta",
      label: "Destination link / CTA",
      detail: "Give us the link, phone number, QR destination, or call to action.",
      categories: ["url-link"],
      value: valueFor("destination"),
    },
    {
      id: "required-wording",
      label: "Required wording/disclosures",
      detail: "Send any exact wording, hashtags, disclaimers, dates, or prices.",
      categories: ["document-reference"],
      contentKinds: ["text", "confirmation", "file-metadata"],
      value: valueFor("exact-wording"),
    },
    {
      id: "avoid",
      label: "Anything to avoid",
      detail: "Tell us what should not be said, shown, or implied.",
      categories: ["other"],
      value: valueFor("avoid"),
    },
  ];
}

function buildSocialActionCards(
  campaign: CampaignRecord,
  requests: BoardRequest[],
): MaterialActionCard[] {
  const usedRequestIds = new Set<string>();
  const definitions = resolveSocialMaterialDefinitions(campaign);

  return definitions.map((definition) => {
    const request = requests.find((candidate) => {
      if (usedRequestIds.has(candidate.request.id)) return false;
      return requestMatchesDefinition(candidate.request, definition);
    });

    if (request) usedRequestIds.add(request.request.id);

    const status = definition.value ? "Received" : request ? requestStatus(request.request) : "Not Available Yet";
    return {
      id: definition.id,
      label: definition.label,
      detail: request?.request.reason ?? definition.detail,
      status,
      request: status === "Still Needed" ? request : undefined,
    };
  });
}

function buildGenericActionCards(requests: BoardRequest[]): MaterialActionCard[] {
  return requests.map((request) => {
    const title = "prompt" in request.request ? request.request.prompt : request.request.label;
    return {
      id: `${request.kind}:${request.request.id}`,
      label: title,
      detail: "prompt" in request.request ? request.request.reason : `Needed for ${request.request.reason}`,
      status: requestStatus(request.request),
      request: request.request.canSubmit ? request : undefined,
    };
  });
}

function buildSubmittedRequestItems(requests: BoardRequest[]): ReceivedMaterial[] {
  return requests
    .filter(({ request }) => request.isPendingReview || request.reviewStatus === "submitted")
    .map(({ kind, request }) => ({
      id: `submitted:${kind}:${request.id}`,
      label: "prompt" in request ? request.prompt : request.label,
      value: formatReceivedStatus(request.submittedAt),
      status: "Received",
    }));
}

function SubmitFields({
  contentKind,
  values,
  onChange,
  fileSelection,
  onFileSelect,
  disabled,
}: {
  contentKind: MaterialContentKind;
  values: ClientSubmitPayload;
  onChange: (field: keyof ClientSubmitPayload, value: string) => void;
  fileSelection?: FileSelectionState;
  onFileSelect: (file: File | null) => void;
  disabled: boolean;
}) {
  const fields = payloadFieldsForKind(contentKind);
  return (
    <div className="sb-materials-intake__fields">
      {contentKind === "file-metadata" ? (
        <div className="sb-materials-intake__file-picker">
          <label className="utility-btn utility-btn--secondary sb-materials-intake__file-button">
            <span>Choose file</span>
            <input
              className="sb-materials-intake__file-input"
              type="file"
              accept="image/png,image/jpeg,.png,.jpg,.jpeg,.pdf,.doc,.docx,.txt,.mp3,.wav,.mp4"
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";
                onFileSelect(file);
              }}
            />
          </label>
          {fileSelection ? (
            <div
              className={`sb-materials-intake__file-state sb-materials-intake__file-state--${fileSelection.kind}`}
              role={fileSelection.kind === "error" ? "alert" : "status"}
            >
              {fileSelection.previewDataUrl ? (
                <span
                  className="sb-materials-intake__file-thumb"
                  role="img"
                  aria-label={`Preview of ${fileSelection.fileName ?? "selected image"}`}
                  style={{ backgroundImage: `url("${fileSelection.previewDataUrl}")` }}
                />
              ) : (
                <span className="sb-materials-intake__file-thumb sb-materials-intake__file-thumb--file">
                  File
                </span>
              )}
              <span className="sb-materials-intake__file-copy">
                <strong>{fileSelection.fileName ?? "File selection"}</strong>
                <span>{fileSelection.message}</span>
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
      {fields.map((field) => (
        <label key={field} className="sb-materials-intake__field">
          <span className="sb-materials-intake__field-label">{fieldLabel(field)}</span>
          {field === "text" || field === "note" ? (
            <textarea
              className="sb-materials-intake__input"
              rows={field === "text" ? 4 : 2}
              value={values[field] ?? ""}
              disabled={disabled}
              onChange={(event) => onChange(field, event.target.value)}
            />
          ) : (
            <input
              className="sb-materials-intake__input"
              type={field === "url" ? "url" : "text"}
              value={values[field] ?? ""}
              disabled={disabled}
              onChange={(event) => onChange(field, event.target.value)}
            />
          )}
        </label>
      ))}
    </div>
  );
}

export default function StudioBoardMaterialsWorkflow({ campaign }: { campaign: CampaignRecord }) {
  const [data, setData] = useState<MaterialsClientResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ClientSubmitPayload>>({});
  const [fileSelections, setFileSelections] = useState<Record<string, FileSelectionState>>({});
  const materialsEndpoint = `/api/campaigns/${encodeURIComponent(campaign.campaignId)}/materials?audience=client`;
  const paidCampaign = Boolean(campaign.paymentReceivedAt);
  const socialPostsCampaign = isSocialPostsCampaign(campaign);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(materialsEndpoint);
      const json = (await res.json()) as MaterialsClientResponse;
      if (!res.ok) {
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      setData(json);
      window.dispatchEvent(new Event("studio-squishy:campaign-updated"));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load materials.");
    } finally {
      setLoading(false);
    }
  }, [materialsEndpoint]);

  useEffect(() => {
    if (paidCampaign) {
      const timeout = window.setTimeout(() => void refresh(), 0);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => setLoading(false), 0);
    return () => window.clearTimeout(timeout);
  }, [paidCampaign, refresh]);

  useEffect(() => {
    if (!activeCardId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveCardId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCardId]);

  const requests = useMemo<BoardRequest[]>(() => {
    const consolidated = (data?.consolidatedRequests ?? []).map((request) => ({
      kind: "consolidated" as const,
      request,
    }));
    const optional = (data?.optionalRequests ?? []).map((request) => ({
      kind: "optional" as const,
      request,
    }));
    const visible = [...consolidated, ...optional];
    if (!socialPostsCampaign) return visible;
    return visible.filter(({ request }) => !shouldHideSocialPostsRequest(request));
  }, [data?.consolidatedRequests, data?.optionalRequests, socialPostsCampaign]);

  const receivedMaterials = useMemo(() => {
    const base = resolveReceivedMaterials(campaign);
    const submitted = buildSubmittedRequestItems(requests);
    const submittedIds = new Set(base.map((item) => item.label.toLowerCase()));
    return [
      ...base,
      ...submitted.filter((item) => !submittedIds.has(item.label.toLowerCase())),
    ];
  }, [campaign, requests]);

  const actionCards = useMemo(
    () => (socialPostsCampaign ? buildSocialActionCards(campaign, requests) : buildGenericActionCards(requests)),
    [campaign, requests, socialPostsCampaign],
  );

  const activeCard = actionCards.find((card) => card.id === activeCardId && card.request);
  const activeRequest = activeCard?.request;
  const activeRequestId = activeRequest?.request.id;

  const showWorkflow = useMemo(() => {
    if (socialPostsCampaign) return true;
    if (campaign.projectDetailsSubmittedAt || campaign.routeMapIntakeSubmittedAt) return true;
    if ((data?.clientIntakeCount ?? data?.blockingRequiredCount ?? 0) > 0) return true;
    return requests.length > 0 || loading;
  }, [
    campaign.projectDetailsSubmittedAt,
    campaign.routeMapIntakeSubmittedAt,
    data?.blockingRequiredCount,
    data?.clientIntakeCount,
    loading,
    requests.length,
    socialPostsCampaign,
  ]);

  const updateDraft = (id: string, field: keyof ClientSubmitPayload, value: string) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  };

  const selectFile = async (id: string, file: File | null) => {
    if (!file) return;
    if (file.size > MATERIALS_IMAGE_PREVIEW_MAX_BYTES) {
      setFileSelections((current) => ({
        ...current,
        [id]: {
          kind: "error",
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          message: "This file is too large. Please choose a file under 5 MB.",
        },
      }));
      return;
    }

    const mimeType = file.type || "application/octet-stream";
    updateDraft(id, "fileName", file.name);
    updateDraft(id, "mimeType", mimeType);

    if (!mimeType.startsWith("image/")) {
      setFileSelections((current) => ({
        ...current,
        [id]: {
          kind: "selected",
          fileName: file.name,
          mimeType,
          message: "File selected locally. Preview is not available for this file type.",
        },
      }));
      return;
    }

    try {
      const previewDataUrl = await readFileAsDataUrl(file);
      setFileSelections((current) => ({
        ...current,
        [id]: {
          kind: "selected",
          fileName: file.name,
          mimeType,
          previewDataUrl,
          message: "Image selected locally. Send to Studio when you are ready.",
        },
      }));
    } catch {
      setFileSelections((current) => ({
        ...current,
        [id]: {
          kind: "error",
          fileName: file.name,
          mimeType,
          message: "We could not preview this image. Please choose another PNG or JPG.",
        },
      }));
    }
  };

  const submitActiveRequest = async () => {
    if (!activeRequest || !activeRequestId) return;
    setSubmittingId(activeRequestId);
    setError(null);
    try {
      const body =
        activeRequest.kind === "consolidated"
          ? {
              action: "client_submit_consolidated",
              consolidatedItemId: activeRequestId,
              payload: drafts[activeRequestId] ?? {},
            }
          : {
              action: "client_submit",
              itemId: activeRequestId,
              payload: drafts[activeRequestId] ?? {},
            };
      const res = await fetch(materialsEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as MaterialsClientResponse;
      if (!res.ok) throw new Error(json.error ?? `Submit failed (${res.status})`);
      setData(json);
      setActiveCardId(null);
      setDrafts((current) => {
        const next = { ...current };
        delete next[activeRequestId];
        return next;
      });
      window.dispatchEvent(new Event("studio-squishy:campaign-updated"));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Submit failed.");
    } finally {
      setSubmittingId(null);
    }
  };

  if (!showWorkflow) return null;

  return (
    <>
      <article className="sb-card sb-card--materials-received sb-materials-tile bf-material bf-material-paper">
        <p className="sb-card__tab">Materials Received</p>
        <div className="sb-materials-board-tile">
          <p className="sb-materials-board-tile__lead">What The Studio already has for this project.</p>
          <ul className="sb-materials-board-list">
            {receivedMaterials.map((item) => (
              <li key={item.id} className="sb-materials-board-list__item">
                <span className="sb-materials-board-list__copy">
                  <span className="sb-materials-board-list__label">{item.label}</span>
                  {item.value ? <span className="sb-materials-board-list__value">{item.value}</span> : null}
                </span>
                <span
                  className={`sb-materials-board-status sb-materials-board-status--${item.status
                    .toLowerCase()
                    .replaceAll(" ", "-")}`}
                >
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </article>

      <article className="sb-card sb-card--materials-needed sb-materials-tile bf-material bf-material-paper">
        <p className="sb-card__tab">Materials We Still Need</p>
        <div className="sb-materials-board-tile">
          {loading ? (
            <p className="sb-materials-board-tile__meta" aria-busy="true">
              Loading materials...
            </p>
          ) : null}
          {error ? (
            <p className="sb-materials-board-tile__error" role="alert">
              {error}
            </p>
          ) : null}
          {!loading ? (
            <div className="sb-materials-action-list">
              {actionCards.map((card) => {
                const clickable = card.status === "Still Needed" && Boolean(card.request);
                return (
                  <button
                    key={card.id}
                    type="button"
                    className={`sb-materials-action-card${
                      clickable ? " sb-materials-action-card--clickable" : ""
                    }`}
                    disabled={!clickable}
                    onClick={() => setActiveCardId(card.id)}
                  >
                    <span className="sb-materials-action-card__head">
                      <span className="sb-materials-action-card__label">{card.label}</span>
                      <span
                        className={`sb-materials-board-status sb-materials-board-status--${card.status
                          .toLowerCase()
                          .replaceAll(" ", "-")}`}
                      >
                        {card.status}
                      </span>
                    </span>
                    <span className="sb-materials-action-card__detail">{card.detail}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </article>

      <article className="sb-card sb-card--materials-next sb-materials-tile bf-material bf-material-paper">
        <p className="sb-card__tab">What You Should Do Next</p>
        <div className="sb-materials-board-next">
          <p>Choose one item to finish. You can save and come back later.</p>
        </div>
      </article>

      {activeCard && activeRequest && activeRequestId ? (
        <div
          className="sb-materials-slideout"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sb-materials-slideout-title"
        >
          <button
            type="button"
            className="sb-materials-slideout__backdrop"
            aria-label="Close material request"
            onClick={() => setActiveCardId(null)}
          />
          <section className="sb-materials-slideout__panel">
            <header className="sb-materials-slideout__header">
              <div>
                <p className="sb-materials-slideout__eyebrow">Material Request</p>
                <h2 id="sb-materials-slideout-title" className="sb-materials-slideout__title">
                  {activeCard.label}
                </h2>
              </div>
              <button
                type="button"
                className="sb-materials-slideout__close"
                onClick={() => setActiveCardId(null)}
              >
                Close
              </button>
            </header>
            <div className="sb-materials-slideout__body">
              <p className="sb-materials-slideout__reason">{activeCard.detail}</p>
              {"reviewStatus" in activeRequest.request &&
              activeRequest.request.reviewStatus === "needs_clarification" ? (
                <p className="sb-materials-intake__clarify" role="status">
                  {materialsConfig.clientNeedsClarificationBody}
                </p>
              ) : null}
              {error ? (
                <p className="sb-materials-board-tile__error" role="alert">
                  {error}
                </p>
              ) : null}
              <SubmitFields
                contentKind={activeRequest.request.contentKind}
                values={drafts[activeRequestId] ?? {}}
                onChange={(field, value) => updateDraft(activeRequestId, field, value)}
                fileSelection={fileSelections[activeRequestId]}
                onFileSelect={(file) => void selectFile(activeRequestId, file)}
                disabled={submittingId === activeRequestId}
              />
              <button
                type="button"
                className="utility-btn utility-btn--primary sb-materials-slideout__submit"
                disabled={submittingId === activeRequestId}
                onClick={() => void submitActiveRequest()}
              >
                {materialsConfig.clientSubmitLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
