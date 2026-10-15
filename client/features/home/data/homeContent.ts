import { fitColors } from "@/styles/themeTokens";
import type { HomeFooterGroup, HomeRouteLink } from "../types";

export const homeMetadata = {
  description:
    "Portfolio analysis, market context, and guided explanations for students and newer investors.",
  themeColor: fitColors.page,
  title: "FIT | Financial Investment Tool",
} as const;

export const homeHeroActions = {
  primary: "Get started",
  secondary: "Explore the tools",
};

export const homePreviewMetrics = [
  {
    label: "Historical return",
    description: "How the value changed over the selected period.",
  },
  {
    label: "Volatility",
    description: "How widely returns varied along the way.",
  },
  {
    label: "Drawdown",
    description: "How far the value fell from a previous high.",
  },
] as const;

export const homeCta = {
  body: "Choose the companies you want to analyse. Take a closer look at return and risk.",
  primarySignedIn: "Open portfolio",
  primarySignedOut: "Create an account",
  title: "Start with your portfolio.",
} as const;

export const homeRouteLinks = [
  {
    description:
      "Read historical performance alongside volatility and drawdown. Compare with a benchmark to understand how your portfolio has behaved.",
    gated: true,
    href: "/Portfolio",
    label: "Portfolio",
  },
  {
    description:
      "Keep the companies you follow and your research notes together. Pick up where you left off when it is time for a closer look.",
    gated: true,
    href: "/Watchlist",
    label: "Watchlist",
  },
  {
    description:
      "Follow companies and themes, check the source and publication date, and bring the wider market into your research.",
    gated: true,
    href: "/MarketNews",
    label: "Market News",
  },
  {
    description:
      "Explore community discussions, share your reasoning and compare ideas with other people learning about investing.",
    gated: true,
    href: "/Community",
    label: "Community",
  },
] as const satisfies readonly HomeRouteLink[];

export const homeFooterGroups = [
  {
    items: [
      { href: "#product", label: "Features" },
      { href: "#experience", label: "Learning" },
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
