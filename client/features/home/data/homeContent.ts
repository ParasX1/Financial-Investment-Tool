import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import NewspaperRoundedIcon from "@mui/icons-material/NewspaperRounded";
import type {
  HomeExperiencePoint,
  HomeFooterGroup,
  HomeRouteLink,
} from "../types";

export const homeMetadata = {
  description:
    "A focused workspace for portfolio analytics, market context, and investment discussion.",
  themeColor: "#000000",
  title: "FIT | Financial Investment Tool",
} as const;

export const homeHeroActions = {
  primary: "Sign in",
  secondary: "See features",
};

export const homeCta = {
  body: "Analyze markets, optimize portfolios, and keep the conversation close to the decision.",
  primarySignedIn: "Open dashboard",
  primarySignedOut: "Start free today",
  title: "Ready to get FIT?",
} as const;

export const homeRouteLinks = [
  {
    description:
      "Analyze allocation, performance, and downside exposure without leaving the dashboard.",
    gated: true,
    highlights: [
      "Sharpe, Sortino, alpha, beta, and volatility",
      "Efficient frontier and allocation views",
      "Value at Risk, drawdown, and correlation context",
    ],
    href: "/dashboardView",
    icon: AccountBalanceWalletRoundedIcon,
    label: "Portfolio",
  },
  {
    description:
      "Stay close to the market stories that can change a portfolio decision.",
    gated: true,
    highlights: [
      "Market, regional, industry, and commodity news",
      "Ticker search with quote and sparkline context",
      "Trending symbols for quick scanning",
    ],
    href: "/MarketNews",
    icon: NewspaperRoundedIcon,
    label: "Market News",
  },
  {
    description:
      "Use discussion to pressure-test ideas before they become positions.",
    gated: true,
    highlights: [
      "Post theses, questions, and portfolio reviews",
      "Reply threads for follow-up reasoning",
      "Smart tags that keep discussions easy to scan",
    ],
    href: "/Community",
    icon: GroupsRoundedIcon,
    label: "Community",
  },
] as const satisfies readonly HomeRouteLink[];

export const homeExperiencePoints = [
  {
    description: "Risk and return in the same view.",
    icon: AutoGraphRoundedIcon,
    label: "Portfolio clarity",
  },
  {
    description: "Headlines, ticker context, and watchlists together.",
    icon: NewspaperRoundedIcon,
    label: "Market context",
  },
  {
    description: "Use community notes to test an idea.",
    icon: GroupsRoundedIcon,
    label: "Second opinion",
  },
  {
    description: "Plain-English context for unfamiliar metrics.",
    icon: MenuBookRoundedIcon,
    label: "Metric meaning",
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
