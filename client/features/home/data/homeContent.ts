import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import NewspaperRoundedIcon from "@mui/icons-material/NewspaperRounded";
import type { HomeExperiencePoint, HomeNavItem, HomeRouteLink } from "../types";

export const homeNavItems: HomeNavItem[] = [
  { href: "#product", id: "product", label: "Product" },
  { href: "#experience", id: "experience", label: "Experience" },
];

export const homeHeroActions = {
  primary: "Enter FIT",
  secondary: "Explore",
};

export const homeRouteLinks: HomeRouteLink[] = [
  {
    description: "Risk, allocation, and portfolio movement in one workspace.",
    gated: true,
    href: "/dashboardView",
    icon: AccountBalanceWalletRoundedIcon,
    label: "Portfolio",
  },
  {
    description: "Market context without jumping between tabs.",
    gated: true,
    href: "/MarketNews",
    icon: NewspaperRoundedIcon,
    label: "Market News",
  },
  {
    description: "Shared thinking when an idea needs another angle.",
    gated: true,
    href: "/Community",
    icon: GroupsRoundedIcon,
    label: "Community",
  },
];

export const homeExperiencePoints: HomeExperiencePoint[] = [
  {
    description: "See risk and return in the same conversation.",
    icon: AutoGraphRoundedIcon,
    label: "Portfolio clarity",
  },
  {
    description:
      "Bring headlines, ticker context, and your watchlist closer together.",
    icon: NewspaperRoundedIcon,
    label: "Market context",
  },
  {
    description: "Use guide topics and community notes to test the idea.",
    icon: GroupsRoundedIcon,
    label: "Second opinion",
  },
  {
    description: "Use guide topics when a metric needs plain-English context.",
    icon: MenuBookRoundedIcon,
    label: "Metric meaning",
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
