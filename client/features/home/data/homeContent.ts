import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import NewspaperRoundedIcon from "@mui/icons-material/NewspaperRounded";
import type {
  HomeExperiencePoint,
  HomeFooterGroup,
  HomeRouteLink,
} from "../types";

export const homeMetadata = {
  description:
    "Portfolio analysis, market context, and guided explanations for students and newer investors.",
  themeColor: "#000000",
  title: "FIT | Financial Investment Tool",
} as const;

export const homeHeroActions = {
  primary: "Sign in",
  secondary: "See how FIT works",
};

export const homeCta = {
  body: "Use FIT to practise a clear research process at your own pace.",
  primarySignedIn: "Open workspace",
  primarySignedOut: "Create an account",
  title: "Build confidence through practice.",
} as const;

export const homeRouteLinks = [
  {
    description:
      "What has driven performance? See return and risk in context, then identify what deserves a closer look.",
    gated: true,
    href: "/dashboardView",
    icon: AccountBalanceWalletRoundedIcon,
    label: "Portfolio",
  },
  {
    description:
      "What changed in the market? Follow a theme or ticker and read beyond the headline.",
    gated: true,
    href: "/MarketNews",
    icon: NewspaperRoundedIcon,
    label: "Market News",
  },
  {
    description:
      "How strong is the case? Compare viewpoints, make your reasoning explicit, and refine the next question.",
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
