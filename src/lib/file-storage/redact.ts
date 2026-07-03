import { isSupabasePrivateStorageRef } from "@/lib/file-registry/job-files";
import type {
  StudioFileReference,
  StudioFileStorageReference,
} from "@/lib/file-registry/types";
import type {
  JobClientDeliveryFile,
  JobWorkPacket,
  JobWorkingFileRef,
  PurchasedJobRecord,
} from "@/lib/job-control/types";

import { fileRoomFileAccessPath } from "./routes";

export function redactPrivateStorageRefForClient(
  storageRef: StudioFileStorageReference,
): StudioFileStorageReference {
  if (!isSupabasePrivateStorageRef(storageRef)) return storageRef;
  return {
    ...storageRef,
    bucket: "",
    objectPath: "",
    objectVersion: undefined,
    checksumSha256: undefined,
  };
}

export function redactFileReferenceForClient(file: StudioFileReference): StudioFileReference {
  return {
    ...file,
    storageRef: redactPrivateStorageRefForClient(file.storageRef),
  };
}

export function redactWorkingFileRefForClient(ref: JobWorkingFileRef): JobWorkingFileRef {
  const privateRef = ref.storageRef ? isSupabasePrivateStorageRef(ref.storageRef) : false;
  return {
    ...ref,
    url: privateRef && ref.registryFileId ? fileRoomFileAccessPath(ref.registryFileId, "download") : ref.url,
    storageRef: ref.storageRef ? redactPrivateStorageRefForClient(ref.storageRef) : undefined,
  };
}

export function redactClientDeliveryFileForClient(
  file: JobClientDeliveryFile,
): JobClientDeliveryFile {
  const privateRef = file.storageRef ? isSupabasePrivateStorageRef(file.storageRef) : false;
  return {
    ...file,
    url: privateRef && file.registryFileId ? fileRoomFileAccessPath(file.registryFileId, "download") : file.url,
    storageRef: file.storageRef ? redactPrivateStorageRefForClient(file.storageRef) : undefined,
  };
}

export function redactWorkPacketForClient(packet: JobWorkPacket): JobWorkPacket {
  return {
    ...packet,
    returnedFileRefs: packet.returnedFileRefs.map((ref) => ({
      ...ref,
      url:
        ref.storageRef && isSupabasePrivateStorageRef(ref.storageRef) && ref.registryFileId
          ? fileRoomFileAccessPath(ref.registryFileId, "download")
          : ref.url,
      storageRef: ref.storageRef ? redactPrivateStorageRefForClient(ref.storageRef) : undefined,
    })),
  };
}

export function redactJobFileStorageForClient(job: PurchasedJobRecord): PurchasedJobRecord {
  return {
    ...job,
    workingFileRefs: (job.workingFileRefs ?? []).map(redactWorkingFileRefForClient),
    workPackets: (job.workPackets ?? []).map(redactWorkPacketForClient),
    fileRegistry: (job.fileRegistry ?? []).map(redactFileReferenceForClient),
    clientDeliveryFiles: (job.clientDeliveryFiles ?? []).map(redactClientDeliveryFileForClient),
  };
}
