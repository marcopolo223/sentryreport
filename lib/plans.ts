export type MembershipPlanId = "free" | "standard" | "pro";

export type MembershipPlan = {
  id: MembershipPlanId;
  name: string;
  tagline: string;
  priceLabel: string;
  features: string[];
  highlighted?: boolean;
};

export type PlanLimits = {
  maxOfficers: number | null;
  storageBytes: number;
  branding: boolean;
  aiPolish: boolean;
  builders: boolean;
  videoSeconds: number;
  overagePerGbCents: number | null;
  aiCapPerMonth: number | null;
};

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

export const PLAN_LIMITS: Record<MembershipPlanId, PlanLimits> = {
  free: {
    maxOfficers: 2,
    storageBytes: 500 * MB,
    branding: false,
    aiPolish: false,
    builders: false,
    videoSeconds: 30,
    overagePerGbCents: null,
    aiCapPerMonth: null,
  },
  standard: {
    maxOfficers: 8,
    storageBytes: 10 * GB,
    branding: true,
    aiPolish: false,
    builders: true,
    videoSeconds: 90,
    overagePerGbCents: 15,
    aiCapPerMonth: null,
  },
  pro: {
    maxOfficers: null,
    storageBytes: 50 * GB,
    branding: true,
    aiPolish: true,
    builders: true,
    videoSeconds: 180,
    overagePerGbCents: 10,
    aiCapPerMonth: 300,
  },
};

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Core reporting for a small team.",
    priceLabel: "$0",
    features: [
      "Up to 2 security officers",
      "500 MB report media storage",
      "Guided incident reports & PDF export",
      "Default intake questions and PDF template",
      "No branding, AI polish, or builders",
      "Video attachments up to 30 seconds",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    tagline: "For active security teams.",
    priceLabel: "$29 / month",
    highlighted: true,
    features: [
      "Up to 8 security officers",
      "10 GB included storage, then $0.15/GB",
      "Org logo & banner branding",
      "Question builder and PDF template builder",
      "Video attachments up to 90 seconds",
      "No AI narrative polish",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For multi-property operations.",
    priceLabel: "$89 / month",
    features: [
      "Unlimited security officers",
      "50 GB included storage, then $0.10/GB",
      "Everything in Standard",
      "AI narrative polish coming later on Pro",
      "Video attachments up to 3 minutes",
    ],
  },
];
