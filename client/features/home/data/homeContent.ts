import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import NewspaperRoundedIcon from "@mui/icons-material/NewspaperRounded";
import type {
  HomeExperiencePoint,
  HomeFooterGroup,
  HomeNavItem,
  HomeRouteLink,
} from "../types";

export const homeMetadata = {
  description:
    "A focused workspace for portfolio analytics, market context, and investment discussion.",
  themeColor: "#000000",
  title: "FIT | Financial Investment Tool",
} as const;

export const homeNavItems: HomeNavItem[] = [
  { href: "#product", id: "product", label: "Product" },
  { href: "#experience", id: "experience", label: "Experience" },
];

export const homeHeroActions = {
  primary: "Sign in",
  secondary: "See features",
};

export const homeCta = {
  body:
    "Analyze markets, optimize portfolios, and keep the conversation close to the decision.",
  primarySignedIn: "Open dashboard",
  primarySignedOut: "Start free today",
  title: "Ready to get FIT?",
} as const;

export const homeRouteLinks: HomeRouteLink[] = [
  {
    description: "Risk, allocation, and movement together.",
    gated: true,
    href: "/dashboardView",
    icon: AccountBalanceWalletRoundedIcon,
    label: "Portfolio",
  },
  {
    description: "Headlines and context near your portfolio.",
    gated: true,
    href: "/MarketNews",
    icon: NewspaperRoundedIcon,
    label: "Market News",
  },
  {
    description: "Discuss ideas before they become decisions.",
    gated: true,
    href: "/Community",
    icon: GroupsRoundedIcon,
    label: "Community",
  },
];

export const homeExperiencePoints: HomeExperiencePoint[] = [
  {
    description: "Risk and return in the same view.",
    icon: AutoGraphRoundedIcon,
    label: "Portfolio clarity",
  },
  {
    description:
      "Headlines, ticker context, and watchlists together.",
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
];

export const homeFooterGroups: HomeFooterGroup[] = [
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
];
