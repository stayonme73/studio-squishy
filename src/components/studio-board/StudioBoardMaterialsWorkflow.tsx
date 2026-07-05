"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import StudioBoardSlideOutPanel from "@/components/studio-board/StudioBoardSlideOutPanel";
import { materialsConfig } from "@/config/materials";
import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import { resolveBoardNextStepPanelMessage } from "@/lib/studio-board-client-copy";
import { isIntakeComplete } from "@/lib/studio-board-campaign";
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

type BoardMaterialStatus = "Still Needed" | "Received" | "Optional" | "Not Applicable";

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
  status: Extract<BoardMaterialStatus, "Received" | "Not Applicable">;
};

type SocialMaterialDefinition = {
  id: string;
  label: string;
  detail: string;
  receivedDetail: string;
  categories: readonly MaterialCategory[];
  contentKinds?: readonly MaterialContentKind[];
  value?: string;
};

const SOCIAL_POSTS_JOB_ID = "v2-rtu-social-posts";
const CAMPAIGN_MESSAGE_CARD_ID = "campaign-message";
const CAMPAIGN_GOAL_UNAVAILABLE_TEXT = "I do not have this yet.";
const CAMPAIGN_GOAL_OPTIONS = [
  "Promote an offer",
  "Announce something new",
  "Share an event",
  "Build awareness",
  "Encourage bookings or inquiries",
  "Something else",
] as const;

function statusModifier(status: BoardMaterialStatus): string {
  if (status === "Not Applicable") return "not-applicable";
  if (status === "Optional") return "optional";
  return status.toLowerCase().replaceAll(" ", "-");
}

function resolveClientMaterialInstruction(
  request: ClientConsolidatedRequest | ClientOptionalRequest,
  status: BoardMaterialStatus,
): string {
  if (status === "Received") {
    return "We received this material and our team is reviewing it.";
  }

  const key =
    `${request.category}:${request.contentKind}` as keyof typeof materialsConfig.clientRequestWhyNeeded;
  return (
    materialsConfig.clientRequestWhyNeeded[key] ??
    "Please share the material we need for this project."
  );
}

function resolveSocialMaterialInstruction(
  definition: Pick<SocialMaterialDefinition, "detail" | "receivedDetail">,
  status: BoardMaterialStatus,
): string {
  if (status === "Received") return definition.receivedDetail;
  return definition.detail;
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

function boardRequestStatus(
  request: ClientConsolidatedRequest | ClientOptionalRequest,
  kind: BoardRequest["kind"],
): BoardMaterialStatus {
  if (request.clientAvailability === "not_available_yet") return "Not Applicable";
  if (
    request.isPendingReview ||
    request.reviewStatus === "submitted" ||
    request.reviewStatus === "approved_for_use"
  ) {
    return "Received";
  }
  if (kind === "optional" && request.canSubmit) return "Optional";
  if (request.canSubmit) return "Still Needed";
  return "Not Applicable";
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
    status: item.value ? "Received" : "Not Applicable",
  }));
}

function resolveSocialMaterialDefinitions(campaign: CampaignRecord): SocialMaterialDefinition[] {
  const received = resolveReceivedMaterials(campaign);
  const valueFor = (id: string) => received.find((item) => item.id === id)?.value;

  return [
    {
      id: "campaign-message",
      label: "Campaign goal/message",
      detail: "Tell us the main message you want these posts to communicate.",
      receivedDetail: "Campaign message received.",
      categories: ["factual-confirmation", "document-reference"],
      contentKinds: ["text", "confirmation"],
      value: valueFor("campaign-goal"),
    },
    {
      id: "platform-format",
      label: "Platform/format",
      detail: "Tell us where these posts will be published and any size requirements.",
      receivedDetail: "Platform and format details received.",
      categories: [],
      value: valueFor("platform-format"),
    },
    {
      id: "brand-visuals",
      label: "Brand/logo/visual references",
      detail: "Upload your logo, brand assets, or visual examples if available.",
      receivedDetail: "Brand assets or visual references received.",
      categories: ["logo-brand", "photo-video"],
      contentKinds: ["file-metadata", "text"],
      value: valueFor("brand-materials"),
    },
    {
      id: "destination-cta",
      label: "Destination link / CTA",
      detail: "Share the website, landing page, phone number, or call to action these posts should use.",
      receivedDetail: "Website or landing page received.",
      categories: ["url-link"],
      value: valueFor("destination"),
    },
    {
      id: "required-wording",
      label: "Required wording/disclosures",
      detail: "Include any required legal wording, hashtags, or disclosures.",
      receivedDetail: "Required wording or disclosures received.",
      categories: ["document-reference"],
      contentKinds: ["text", "confirmation", "file-metadata"],
      value: valueFor("exact-wording"),
    },
    {
      id: "avoid",
      label: "Anything to avoid",
      detail: "Tell us anything you do not want included in this project.",
      receivedDetail: "Exclusions or avoid list received.",
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

    const status =
      definition.id === CAMPAIGN_MESSAGE_CARD_ID && request
        ? boardRequestStatus(request.request, request.kind)
        : definition.value
          ? "Received"
          : request
            ? boardRequestStatus(request.request, request.kind)
            : "Not Applicable";
    return {
      id: definition.id,
      label: definition.label,
      detail: resolveSocialMaterialInstruction(definition, status),
      status,
      request: status === "Still Needed" ? request : undefined,
    };
  });
}

function buildGenericActionCards(requests: BoardRequest[]): MaterialActionCard[] {
  return requests.map((request) => {
    const status = boardRequestStatus(request.request, request.kind);
    return {
      id: `${request.kind}:${request.request.id}`,
      label: request.request.label,
      detail: resolveClientMaterialInstruction(request.request, status),
      status,
      request: request.request.canSubmit ? request : undefined,
    };
  });
}

function buildSubmittedRequestItems(requests: BoardRequest[]): ReceivedMaterial[] {
  return requests
    .filter(
      ({ request }) =>
        request.clientAvailability !== "not_available_yet" &&
        (request.isPendingReview || request.reviewStatus === "submitted"),
    )
    .map(({ kind, request }) => ({
      id: `submitted:${kind}:${request.id}`,
      label: "prompt" in request ? request.prompt : request.label,
      value: formatReceivedStatus(request.submittedAt),
      status: "Received",
    }));
}

function StudioBoardMaterialsEmptyRow() {
  const emptyMaterials = studioBoard.empty.board.materials;

  return (
    <>
      <article className="sb-card sb-card--materials-received sb-materials-tile bf-material bf-material-paper">
        <p className="sb-card__tab">Materials Received</p>
        <div className="sb-materials-board-tile">
          <p className="sb-materials-board-tile__lead">{emptyMaterials.receivedLead}</p>
          <p className="sb-materials-board-tile__meta">{emptyMaterials.received}</p>
        </div>
      </article>

      <article className="sb-card sb-card--materials-needed sb-materials-tile bf-material bf-material-paper">
        <p className="sb-card__tab">Materials We Still Need</p>
        <div className="sb-materials-board-tile">
          <p className="sb-materials-board-tile__meta">{emptyMaterials.stillNeed}</p>
        </div>
      </article>

      <article className="sb-card sb-card--materials-next sb-materials-tile bf-material bf-material-paper">
        <p className="sb-card__tab">What You Should Do Next</p>
        <div className="sb-materials-board-next">
          <p>{emptyMaterials.nextStep}</p>
        </div>
      </article>
    </>
  );
}

function StudioBoardMaterialsWorkflowActive({ campaign }: { campaign: CampaignRecord }) {
  const [data, setData] = useState<MaterialsClientResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [campaignGoalSelection, setCampaignGoalSelection] = useState<string>("");
  const [campaignGoalNote, setCampaignGoalNote] = useState("");
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
    if (!paidCampaign || !isIntakeComplete(campaign)) {
      const timeout = window.setTimeout(() => setLoading(false), 0);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeout);
  }, [campaign, paidCampaign, refresh]);

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

  const nextStepMessage = useMemo(
    () =>
      resolveBoardNextStepPanelMessage({
        campaign,
        blockingRequiredCount: data?.blockingRequiredCount ?? 0,
        stillNeededLabels: actionCards
          .filter((card) => card.status === "Still Needed")
          .map((card) => card.label),
      }),
    [actionCards, campaign, data?.blockingRequiredCount],
  );

  const activeCard = actionCards.find(
    (card) => card.id === CAMPAIGN_MESSAGE_CARD_ID && card.id === activeCardId && card.request,
  );
  const activeRequest = activeCard?.request;
  const activeRequestId = activeRequest?.request.id;

  const intakeComplete = isIntakeComplete(campaign);

  const showWorkflow = useMemo(() => {
    if (!intakeComplete) return false;
    if (socialPostsCampaign) return true;
    if ((data?.clientIntakeCount ?? data?.blockingRequiredCount ?? 0) > 0) return true;
    return requests.length > 0 || loading;
  }, [
    intakeComplete,
    socialPostsCampaign,
    data?.blockingRequiredCount,
    data?.clientIntakeCount,
    loading,
    requests.length,
  ]);

  const campaignGoalCanSubmit = Boolean(campaignGoalSelection || campaignGoalNote.trim());

  const campaignGoalPayload = (
    availability: NonNullable<ClientSubmitPayload["availability"]>,
  ): ClientSubmitPayload => {
    if (availability === "not_available_yet") {
      return {
        text: CAMPAIGN_GOAL_UNAVAILABLE_TEXT,
        availability,
      };
    }

    const trimmedNote = campaignGoalNote.trim();
    return {
      text: campaignGoalSelection || trimmedNote,
      note: campaignGoalSelection ? trimmedNote || undefined : undefined,
      availability,
    };
  };

  const closePanel = useCallback(() => setActiveCardId(null), []);

  const submitActiveRequest = async (
    availability: NonNullable<ClientSubmitPayload["availability"]> = "available",
  ) => {
    if (!activeRequest || !activeRequestId) return;
    if (availability === "available" && !campaignGoalCanSubmit) return;
    setSubmittingId(activeRequestId);
    setError(null);
    try {
      const payload = campaignGoalPayload(availability);
      const body =
        activeRequest.kind === "consolidated"
          ? {
              action: "client_submit_consolidated",
              consolidatedItemId: activeRequestId,
              payload,
            }
          : {
              action: "client_submit",
              itemId: activeRequestId,
              payload,
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
      setCampaignGoalSelection("");
      setCampaignGoalNote("");
      window.dispatchEvent(new Event("studio-squishy:campaign-updated"));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Submit failed.");
    } finally {
      setSubmittingId(null);
    }
  };

  const emptyMaterials = studioBoard.empty.board.materials;

  return (
    <>
      <article className="sb-card sb-card--materials-received sb-materials-tile bf-material bf-material-paper">
        <p className="sb-card__tab">Materials Received</p>
        <div className="sb-materials-board-tile">
          <p className="sb-materials-board-tile__lead">{emptyMaterials.receivedLead}</p>
          <ul className="sb-materials-board-list">
            {receivedMaterials.map((item) => (
              <li key={item.id} className="sb-materials-board-list__item">
                <span className="sb-materials-board-list__copy">
                  <span className="sb-materials-board-list__label">{item.label}</span>
                  {item.value ? <span className="sb-materials-board-list__value">{item.value}</span> : null}
                </span>
                <span
                  className={`sb-materials-board-status sb-materials-board-status--${statusModifier(item.status)}`}
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
          {loading && showWorkflow ? (
            <p className="sb-materials-board-tile__meta" aria-busy="true">
              Loading materials...
            </p>
          ) : null}
          {error ? (
            <p className="sb-materials-board-tile__error" role="alert">
              {error}
            </p>
          ) : null}
          {!loading && !showWorkflow ? (
            <p className="sb-materials-board-tile__meta">{emptyMaterials.awaitingProjectDetails}</p>
          ) : null}
          {!loading && showWorkflow && actionCards.length === 0 ? (
            <p className="sb-materials-board-tile__meta">{emptyMaterials.stillNeed}</p>
          ) : null}
          {!loading && showWorkflow && actionCards.length > 0 ? (
            <div className="sb-materials-action-list">
              {actionCards.map((card) => {
                const clickable =
                  card.id === CAMPAIGN_MESSAGE_CARD_ID &&
                  card.status === "Still Needed" &&
                  Boolean(card.request);
                return (
                  <button
                    key={card.id}
                    type="button"
                    className={`sb-materials-action-card${
                      clickable ? " sb-materials-action-card--clickable" : ""
                    }`}
                    disabled={!clickable}
                    onClick={() => {
                      if (clickable) setActiveCardId(card.id);
                    }}
                  >
                    <span className="sb-materials-action-card__head">
                      <span className="sb-materials-action-card__label">{card.label}</span>
                      <span
                        className={`sb-materials-board-status sb-materials-board-status--${statusModifier(card.status)}`}
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
          <p>{nextStepMessage}</p>
        </div>
      </article>

      {showWorkflow && activeCard && activeRequest && activeRequestId ? (
        <StudioBoardSlideOutPanel
          title="Tell us what these posts are for"
          eyebrow="Material Request"
          onClose={closePanel}
          footer={
            <div className="sb-campaign-goal-panel__actions">
              <button
                type="button"
                className="utility-btn utility-btn--secondary"
                disabled={submittingId === activeRequestId}
                onClick={closePanel}
              >
                Save and finish later
              </button>
              <button
                type="button"
                className="utility-btn utility-btn--primary"
                disabled={submittingId === activeRequestId || !campaignGoalCanSubmit}
                onClick={() => void submitActiveRequest("available")}
              >
                Save to Studio
              </button>
              <button
                type="button"
                className="utility-btn utility-btn--secondary"
                disabled={submittingId === activeRequestId}
                onClick={() => void submitActiveRequest("not_available_yet")}
              >
                I do not have this yet
              </button>
            </div>
          }
        >
          <div className="sb-campaign-goal-panel">
            <p className="sb-campaign-goal-panel__intro">
              Pick the closest goal. You can add a short note if there is a date, offer, or detail we
              should know before writing.
            </p>
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
            <fieldset className="sb-campaign-goal-panel__choices">
              <legend className="sb-campaign-goal-panel__legend">Choose a goal</legend>
              <div className="sb-campaign-goal-panel__bubble-list">
                {CAMPAIGN_GOAL_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`sb-campaign-goal-panel__bubble${
                      campaignGoalSelection === option ? " sb-campaign-goal-panel__bubble--selected" : ""
                    }`}
                    aria-pressed={campaignGoalSelection === option}
                    disabled={submittingId === activeRequestId}
                    onClick={() => setCampaignGoalSelection(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="sb-campaign-goal-panel__field">
              <span className="sb-campaign-goal-panel__field-label">Anything else we should know?</span>
              <textarea
                className="sb-campaign-goal-panel__input"
                rows={3}
                placeholder="We are promoting a summer special through July 31."
                value={campaignGoalNote}
                disabled={submittingId === activeRequestId}
                onChange={(event) => setCampaignGoalNote(event.target.value)}
              />
            </label>
          </div>
        </StudioBoardSlideOutPanel>
      ) : null}
    </>
  );
}

/** Six-panel board — materials row always mounted; panel content changes by campaign state. */
export default function StudioBoardMaterialsWorkflow({
  campaign,
  hasCampaign,
}: {
  campaign: CampaignRecord | null;
  hasCampaign: boolean;
}) {
  if (!hasCampaign || !campaign) {
    return <StudioBoardMaterialsEmptyRow />;
  }

  return <StudioBoardMaterialsWorkflowActive campaign={campaign} />;
}
