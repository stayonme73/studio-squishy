/**
 * Route Map V1 — five job-specific intake form schemas (production packet).
 */

import type { RouteMapIntakeType } from "@/config/route-map-v1";

export type RouteMapIntakeField = {
  id: string;
  label: string;
  placeholder?: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  options?: readonly string[];
};

export type RouteMapIntakeSchema = {
  type: RouteMapIntakeType;
  title: string;
  lead: string;
  fields: readonly RouteMapIntakeField[];
};

export type RouteMapIntakeAnswers = Record<string, string>;

export const ROUTE_MAP_INTAKE_SCHEMAS: Record<RouteMapIntakeType, RouteMapIntakeSchema> = {
  discovery: {
    type: "discovery",
    title: "Route Start Intake",
    lead: "Share context so we can recommend the first paid job that fits.",
    fields: [
      {
        id: "businessName",
        label: "Business or project name",
        type: "text",
        required: true,
      },
      {
        id: "whatYouDo",
        label: "What does your business do?",
        type: "textarea",
        required: true,
      },
      {
        id: "currentSituation",
        label: "What is your current situation?",
        type: "select",
        required: true,
        options: [
          "Starting fresh",
          "Trying to stay visible more consistently",
          "Refreshing how my business looks",
          "Promoting an offer, event, sale, or launch",
        ],
      },
      {
        id: "biggestChallenge",
        label: "What is the biggest challenge right now?",
        type: "textarea",
        required: true,
      },
      {
        id: "alreadyHave",
        label: "What do you already have (website, social, logo, etc.)?",
        type: "textarea",
        required: true,
      },
      {
        id: "successLooksLike",
        label: "What would success look like from this Route Start job?",
        type: "textarea",
        required: true,
      },
    ],
  },
  "social-setup": {
    type: "social-setup",
    title: "Social Profile Setup",
    lead: "Tell us which platform and what we should set up or update.",
    fields: [
      {
        id: "platform",
        label: "Platform",
        type: "select",
        required: true,
        options: ["Facebook", "Instagram", "TikTok"],
      },
      {
        id: "businessName",
        label: "Business or profile name",
        type: "text",
        required: true,
      },
      {
        id: "profileGoal",
        label: "What should this profile accomplish?",
        type: "textarea",
        required: true,
      },
      {
        id: "accountAccess",
        label: "How will you provide account access?",
        type: "text",
        required: true,
        placeholder: "Admin invite email, login method, or notes",
      },
      {
        id: "brandNotes",
        label: "Brand colors, fonts, or assets to use",
        type: "textarea",
      },
    ],
  },
  promotion: {
    type: "promotion",
    title: "Social Promotion Intake",
    lead: "Answer only what we need for this social promotion job.",
    fields: [
      { id: "promoting", label: "What are you promoting?", type: "textarea", required: true },
      {
        id: "mustInclude",
        label: "What date, price, offer, or deadline must be included?",
        type: "textarea",
        required: true,
      },
      { id: "callToAction", label: "What do you want people to do next?", type: "text", required: true },
      {
        id: "platform",
        label: "Which one platform are we posting on?",
        type: "select",
        required: true,
        options: ["Facebook", "Instagram", "TikTok"],
      },
      {
        id: "accountControl",
        label: "Do you own and control that account?",
        type: "select",
        required: true,
        options: ["Yes", "No — I need help first"],
      },
      {
        id: "materials",
        label: "What photos, logo, footage, or exact wording must we use?",
        type: "textarea",
        required: true,
      },
    ],
  },
  video: {
    type: "video",
    title: "Short Video Intake",
    lead: "Tell us what the video should communicate.",
    fields: [
      { id: "videoGoal", label: "What is the video promoting or announcing?", type: "textarea", required: true },
      {
        id: "platform",
        label: "Which one platform is it for?",
        type: "select",
        required: true,
        options: ["Facebook", "Instagram", "TikTok"],
      },
      { id: "mustKnow", label: "What must people know or do?", type: "textarea", required: true },
      { id: "footageNotes", label: "Do you have footage, photos, or examples?", type: "textarea", required: true },
      {
        id: "aiVoice",
        label: "Should AI voice be included?",
        type: "select",
        required: true,
        options: ["Yes", "No"],
      },
      {
        id: "mustInclude",
        label: "What date, price, offer, or deadline must appear?",
        type: "textarea",
        required: true,
      },
    ],
  },
  page: {
    type: "page",
    title: "Campaign Page Intake",
    lead: "Tell us what this one page is for.",
    fields: [
      { id: "pageFor", label: "What is the page for?", type: "textarea", required: true },
      { id: "afterReading", label: "What should people do after reading it?", type: "text", required: true },
      { id: "existingWebsite", label: "What website do you already use, if any?", type: "text" },
      {
        id: "actionLink",
        label: "What action link should we use?",
        type: "select",
        required: true,
        options: ["Call", "Booking", "Order", "Directions", "Other approved link"],
      },
      { id: "mustInclude", label: "What details must be included exactly?", type: "textarea", required: true },
      { id: "limitedTime", label: "Is this limited-time?", type: "select", required: true, options: ["Yes", "No"] },
      { id: "needsQr", label: "Do you need a QR code?", type: "select", required: true, options: ["Yes", "No"] },
    ],
  },
  voice: {
    type: "voice",
    title: "Voice Announcement Intake",
    lead: "Share what we are announcing and where it posts.",
    fields: [
      { id: "announcing", label: "What are we announcing?", type: "textarea", required: true },
      {
        id: "platform",
        label: "Which one platform is it for?",
        type: "select",
        required: true,
        options: ["Facebook", "Instagram", "TikTok"],
      },
      { id: "mustSay", label: "What details must be said exactly?", type: "textarea", required: true },
      { id: "callToAction", label: "What should people do next?", type: "text", required: true },
      {
        id: "voiceTone",
        label: "Choose voice tone",
        type: "select",
        required: true,
        options: ["Calm", "Energetic", "Warm", "Direct"],
      },
    ],
  },
  update: {
    type: "update",
    title: "Update Intake",
    lead: "Identify the exact item to update.",
    fields: [
      { id: "itemLink", label: "Paste a link or identify the exact item", type: "text", required: true },
      { id: "whatChange", label: "What needs to change?", type: "textarea", required: true },
      { id: "newInfo", label: "What is the correct new information?", type: "textarea", required: true },
      { id: "remove", label: "What needs to be removed?", type: "textarea" },
      { id: "whereLive", label: "Where is it currently live?", type: "text", required: true },
    ],
  },
};

export function getRouteMapIntakeSchema(type: RouteMapIntakeType): RouteMapIntakeSchema {
  return ROUTE_MAP_INTAKE_SCHEMAS[type];
}
