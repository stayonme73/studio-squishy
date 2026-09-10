/**
 * Local-fixture thread presentation only. Does not change persistence,
 * visibility, or production customer history.
 */
export const LOCAL_BUILDER_QA_COMMUNICATION_MARKER = "[Studio Builder QA]";

const LOCAL_MAYA_CHECK_IN =
  /^Hi, this is Maya at Maya.?s Mobile Boutique\. Checking in on the flyer(?: \d+)?\.?$/i;

export function isLocalBuilderQaCommunicationArtifact(body: string): boolean {
  const trimmed = body.trim();
  if (trimmed.includes(LOCAL_BUILDER_QA_COMMUNICATION_MARKER)) return true;
  return LOCAL_MAYA_CHECK_IN.test(trimmed);
}

export function messagesForOwnerPresentation<T extends { body: string }>(
  messages: readonly T[],
  localFixtureAvailable: boolean,
): T[] {
  if (!localFixtureAvailable) return [...messages];
  return messages.filter((message) => !isLocalBuilderQaCommunicationArtifact(message.body));
}

export function shouldShowMachineAskState(
  askState: "answered" | "waiting_for_customer" | "waiting_for_studio" | "stalled" | undefined,
): boolean {
  return Boolean(askState) && askState !== "answered";
}

export function awaitingReplyPresentation(options: {
  senderRole: "customer" | "studio_staff";
  studioHasReplied: boolean | null;
  hasMachineAnswer: boolean;
  isLastCustomerWithoutStaffReply: boolean;
}): "none" | "studio" | "staff" {
  if (options.senderRole !== "customer") return "none";
  if (options.studioHasReplied !== false) return "none";
  if (!options.isLastCustomerWithoutStaffReply) return "none";
  return options.hasMachineAnswer ? "staff" : "studio";
}

export function lastUnansweredCustomerMessageId<
  T extends {
    id: string;
    senderRole: "customer" | "studio_staff";
    studioHasReplied: boolean | null;
  },
>(messages: readonly T[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.senderRole === "customer" && message.studioHasReplied === false) {
      return message.id;
    }
  }
  return null;
}
