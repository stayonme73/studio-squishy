export { default, handleProtectedRoutes, proxy } from "../proxy";

export const config = {
  matcher: [
    "/file-room",
    "/file-room/(.*)",
    "/studio-kitchen",
    "/studio-kitchen/(.*)",
    "/decision-learner",
    "/decision-learner/(.*)",
    "/studio-board",
    "/feedback-studio",
    "/review-room",
    "/deliverables",
    "/api/campaigns",
    "/api/campaigns/(.*)",
    "/api/decision-learner",
    "/api/decision-learner/(.*)",
  ],
};

