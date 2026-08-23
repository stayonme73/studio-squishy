/**
 * Browser-safe Studio Kitchen projection helpers.
 * Server loaders and folder builders: import from
 * `@/lib/studio-kitchen/load-projection` and `./build-folder`.
 * Do not re-export Node folder builders here — Client Components import this barrel.
 */
export { kitchenDataSourceLabel } from "./data-source-label";
export {
  buildKitchenLiveFileRoomView,
  type KitchenLiveBucketSlotView,
  type KitchenLiveFileRoomView,
  type KitchenLiveFolderSlot,
  type KitchenLiveTraySlotView,
} from "./board-view";
export {
  isKitchenFixtureCampaignId,
  isKitchenFixtureDemoActive,
  isKitchenFixtureDemoRequested,
  kitchenFixtureCampaignIds,
  kitchenFixtureCampaignSeed,
} from "./fixture-boundary";
export {
  jobSpineStatusLabel,
  projectKitchenBucketFromSpine,
} from "./status-projection";
export type {
  KitchenDataSource,
  KitchenHonestyFlags,
  KitchenJobProjection,
  KitchenProductionFolder,
  KitchenProjectedPlacement,
  KitchenProjectionBoard,
  KitchenProjectionDetail,
  KitchenQaState,
  KitchenTaskProjection,
} from "./types";
