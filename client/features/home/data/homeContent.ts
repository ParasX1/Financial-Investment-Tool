import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import NewspaperRoundedIcon from "@mui/icons-material/NewspaperRounded";
import type {
  HomeNavItem,
  HomeRouteLink,
  HomeTrustSignal,
} from "../types";

export const homeNavItems: HomeNavItem[] = [
  { href: "#product", id: "product", label: "Product" },
  { href: "#trust", id: "trust", label: "Trust" },
];

export const homeHeroActions = {
  primary: "Enter FIT",
  secondary: "See product",
};

export const homeRouteLinks: HomeRouteLink[] = [
  {
    description: "Portfolio, risk, and allocation in one workspace.",
    gated: true,
    href: "/dashboardView",
    icon: AccountBalanceWalletRoundedIcon,
    label: "Portfolio",
  },
  {
    description: "Market context without leaving the app.",
    gated: true,
    href: "/MarketNews",
    icon: NewspaperRoundedIcon,
    label: "Market News",
  },
  {
    description: "Shared notes when your idea needs another angle.",
    gated: true,
    href: "/Community",
    icon: GroupsRoundedIcon,
    label: "Community",
  },
];

export const homeTrustSignals: HomeTrustSignal[] = [
  {
    detail: "The front page links only to app surfaces that exist today.",
    label: "Real routes",
  },
  {
    detail: "Account-only areas stay behind sign-in.",
    label: "Private by default",
  },
];

export const homeFooterLinks: HomeRouteLink[] = [
  {
    description: "Metric definitions and portfolio interpretation.",
    href: "/Guide",
    label: "Guide",
  },
  {
    description: "Answers for common FIT tasks.",
    href: "/Help",
    label: "Help Center",
  },
];
