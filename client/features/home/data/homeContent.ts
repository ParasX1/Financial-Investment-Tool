import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import NewspaperRoundedIcon from "@mui/icons-material/NewspaperRounded";
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
  { label: "Annualised volatility", classification: "Estimated" },
  { label: "Drawdown history", classification: "Historical" },
  { label: "Sharpe ratio", classification: "Estimated" },
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
    icon: AccountBalanceWalletRoundedIcon,
    label: "Portfolio",
  },
  {
    description:
      "Follow companies and themes. Compare the source and publication date, then bring market news into your own questions.",
    gated: true,
    href: "/MarketNews",
    icon: NewspaperRoundedIcon,
    label: "Market News",
  },
  {
    description:
      "Compare ideas in the community, make your reasoning explicit and refine the next question as you learn.",
    gated: true,
    href: "/Community",
    icon: GroupsRoundedIcon,
    label: "Community",
  },
] as const satisfies readonly HomeRouteLink[];

export const homeExperiencePoints = [
  {
    description: "Begin with a portfolio, watchlist, or market question.",
    icon: AutoGraphRoundedIcon,
    label: "Observe",
  },
  {
    description: "Read performance and risk together.",
    icon: AccountBalanceWalletRoundedIcon,
    label: "Compare",
  },
  {
    description:
      "Look past the headline and note when the information was published.",
    icon: NewspaperRoundedIcon,
    label: "Check the source",
  },
  {
    description: "Compare viewpoints, then decide what needs more research.",
    icon: GroupsRoundedIcon,
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
