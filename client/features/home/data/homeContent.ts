import { fitColors } from "@/styles/themeTokens";
import type {
  HomeEntryDestination,
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

export const homeTools = {
  "/Portfolio": {
    actionLabel: "Explore portfolio",
    description:
      "Research companies through historical return, volatility and drawdown. Compare performance with a benchmark to put the results in perspective.",
    gated: true,
    href: "/Portfolio",
    label: "Portfolio",
    tagline: "Return is only half the story.",
  },
  "/TopPicks": {
    actionLabel: "Explore top picks",
    description:
      "Sort the available return and risk measures to find companies for a closer look. Use the results as a starting point for your own research.",
    gated: true,
    href: "/TopPicks",
    label: "Top Picks",
    tagline: "Find a starting point.",
  },
  "/Watchlist": {
    actionLabel: "Open watchlist",
    description:
      "Save companies and add your research notes. Return to your shortlist as your ideas develop.",
    gated: true,
    href: "/Watchlist",
    label: "Watchlist",
    tagline: "Your companies. Your notes.",
  },
  "/MarketNews": {
    actionLabel: "Read market news",
    description:
      "Read coverage of companies and market themes. Check the source and publication date, then decide what a story adds to your research.",
    gated: true,
    href: "/MarketNews",
    label: "Market News",
    tagline: "Market news, with context.",
  },
  "/Community": {
    actionLabel: "Explore community",
    description:
      "Explore community discussions, share your reasoning and compare ideas with other people learning about investing.",
    gated: true,
    href: "/Community",
    label: "Community",
    tagline: "Share a view. Hear another.",
  },
} as const satisfies Record<
  HomeEntryDestination,
  HomeRouteLink & { readonly actionLabel: string; readonly tagline: string }
>;

export const homeRouteLinks = Object.values(homeTools);

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
    title: "Resources",
  },
] as const satisfies readonly HomeFooterGroup[];
