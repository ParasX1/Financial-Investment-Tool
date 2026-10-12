import { fitColors } from "@/styles/themeTokens";
import type {
  HomeExperiencePoint,
  HomeFooterGroup,
  HomeRouteLink,
} from "../types";

export const homeMetadata = {
  description:
    "Portfolio analysis, market context, and guided explanations for students and newer investors.",
  themeColor: fitColors.page,
  title: "FIT | Financial Investment Tool",
} as const;

export const homeHeroActions = {
  primary: "Get started",
  secondary: "See how FIT works",
};

export const homePreviewMetrics = [
  { label: "Historical return", classification: "Historical" },
  { label: "Annualised volatility", classification: "Estimated" },
  { label: "Drawdown history", classification: "Historical" },
  { label: "Sharpe ratio", classification: "Estimated" },
  { label: "Alpha", classification: "Estimated" },
  { label: "Value at risk", classification: "Estimated" },
] as const;

export const homeCta = {
  body: "A place to explore the evidence and develop your own view.",
  primarySignedIn: "Open portfolio",
  primarySignedOut: "Create an account",
  title: "Make room for a clearer question.",
} as const;

export const homeRouteLinks = [
  {
    description:
      "Read historical returns alongside volatility, drawdown and risk-adjusted performance. See what deserves a closer look.",
    gated: true,
    href: "/Portfolio",
    label: "Portfolio",
  },
  {
    description:
      "Keep the companies you follow and your research notes together. Return to the questions you want to investigate.",
    gated: true,
    href: "/Watchlist",
    label: "Watchlist",
  },
  {
    description:
      "Follow companies and themes. Compare the source and publication date, then bring market news into your own questions.",
    gated: true,
    href: "/MarketNews",
    label: "Market News",
  },
  {
    description:
      "Compare ideas in the community, make your reasoning explicit and refine the next question as you learn.",
    gated: true,
    href: "/Community",
    label: "Community",
  },
] as const satisfies readonly HomeRouteLink[];

export const homeExperiencePoints = [
  {
    description: "Begin with a portfolio, watchlist, or market question.",
    label: "Observe",
  },
  {
    description: "Read performance and risk together.",
    label: "Compare",
  },
  {
    description:
      "Look past the headline and note when the information was published.",
    label: "Check the source",
  },
  {
    description: "Compare viewpoints, then decide what needs more research.",
    label: "Reflect",
  },
] as const satisfies readonly HomeExperiencePoint[];

export const homeFooterGroups = [
  {
    items: [
      { href: "#product", label: "Features" },
      { href: "#experience", label: "Experience" },
    ],
    title: "Product",
  },
  {
    items: [
      { href: "/Guide", label: "Guide" },
      { href: "/Help", label: "Help Center" },
    ],
    title: "Learn",
  },
] as const satisfies readonly HomeFooterGroup[];
