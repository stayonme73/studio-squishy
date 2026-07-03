export const sharedDriveFileRegistry = {
  approvedLaunchHome: "Google Workspace Shared Drive",
  connectionStatus: "reference_only_no_google_api",
  noConnectionNotice:
    "The Studio records Shared Drive references only. Google APIs, OAuth, credentials, folder creation, uploads, and permission sync are not connected in V1.",
  folderConvention: [
    {
      category: "client_material",
      label: "Client uploads",
      path: "{Client}/{Campaign}/{Job}/01 Client Materials",
    },
    {
      category: "internal_draft",
      label: "Working drafts",
      path: "{Client}/{Campaign}/{Job}/02 Working Drafts",
    },
    {
      category: "review_proof",
      label: "Review proofs",
      path: "{Client}/{Campaign}/{Job}/03 Review Proofs",
    },
    {
      category: "final_delivery",
      label: "Final delivery",
      path: "{Client}/{Campaign}/{Job}/04 Final Delivery",
    },
    {
      category: "internal_only_source",
      label: "Internal-only source files",
      path: "{Client}/{Campaign}/{Job}/99 Internal Source",
    },
  ],
} as const;
