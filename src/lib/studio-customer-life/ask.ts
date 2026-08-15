/**
 * Voice → Machine truth → Voice. Records the question and the truthful answer.
 */
export {
  askCustomerLifeFromStore,
  handleCustomerBoardQuestion,
  readCustomerLifeEnvelope,
  readCustomerLifeStatus,
  recordMayaResponseToStudioRequest,
  resolveCustomerAskState,
  resolveStudioCustomerRequests,
} from "./communication-loop";
