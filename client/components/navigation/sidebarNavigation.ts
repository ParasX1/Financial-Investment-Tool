import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import NewspaperRoundedIcon from "@mui/icons-material/NewspaperRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import type { SvgIconComponent } from "@mui/icons-material";

export type SidebarNavItem = Readonly<{
  gated?: boolean;
  href: string;
  icon: SvgIconComponent;
  label: string;
  match?: (pathname: string) => boolean;
}>;

export const SIDEBAR_MAIN_NAV_ITEMS: readonly SidebarNavItem[] = [
  {
    href: "/Portfolio",
    label: "Portfolio",
    icon: AccountBalanceWalletRoundedIcon,
    gated: true,
    match: (pathname) =>
      pathname === "/Portfolio" || pathname === "/dashboardView",
  },
  {
    href: "/TopPicks",
    label: "Top Picks",
    icon: TrendingUpRoundedIcon,
    gated: true,
  },
  {
    href: "/MarketNews",
    label: "Market News",
    icon: NewspaperRoundedIcon,
    gated: true,
  },
  {
    href: "/Watchlist",
    label: "Watchlist",
    icon: BookmarkBorderRoundedIcon,
    gated: true,
  },
  {
    href: "/Community",
    label: "Community",
    icon: GroupsRoundedIcon,
    gated: true,
    match: (pathname) => pathname.startsWith("/Community"),
  },
  {
    href: "/Guide",
    label: "Guide",
    icon: MenuBookRoundedIcon,
    gated: true,
  },
];

export const SIDEBAR_UTILITY_NAV_ITEMS: readonly SidebarNavItem[] = [
  {
    href: "/Help",
    label: "Help",
    icon: HelpOutlineRoundedIcon,
  },
  {
    href: "/Profile",
    label: "Profile",
    icon: PersonOutlineRoundedIcon,
    gated: true,
  },
];

export const SIDEBAR_HOME_NAV_ITEM: SidebarNavItem = {
  href: "/",
  label: "Back to Home",
  icon: HomeRoundedIcon,
};

export function isSidebarNavItemActive(
  item: SidebarNavItem,
  pathname: string,
) {
  return item.match ? item.match(pathname) : pathname === item.href;
}
