/**
 * Browser-safe Studio Kitchen projection helpers.
 * Server loaders: import from `@/lib/studio-kitchen/load-projection`.
 */
export {
  buildKitchenProductionFolderFromFixture,
  buildKitchenProductionFolderFromLive,
  kitchenDataSourceLabel,
} from "./build-folder";
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
