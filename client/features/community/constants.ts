// File purpose: Centralizes static Community options, labels, limits, and responsive layout constants.
import type {
  CommunityFeedView,
  CommunityTopTimeRange,
  SeedPost,
} from "./types";
import { FIT_CONTENT_MAX_WIDTH_PX } from "@/components/shared/uiPrimitives";

export const COMMUNITY_PAGE_WIDTH = "100%";
export const COMMUNITY_FEED_NAV_ITEMS: Array<{
  id: CommunityFeedView;
  label: string;
  description: string;
}> = [
  {
    id: "top",
    label: "Top",
    description: "Highest-voted discussions",
  },
  {
    id: "new",
    label: "New",
    description: "Latest discussions first",
  },
  {
    id: "my-posts",
    label: "My Posts",
    description: "Discussions you created",
  },
  {
    id: "liked",
    label: "Liked",
    description: "Discussions you voted for",
  },
  {
    id: "commented",
    label: "Commented",
    description: "Discussions you joined",
  },
];
export const COMMUNITY_RESOURCE_LINKS = [
  "Community Rules",
  "Privacy Policy",
  "User Agreement",
  "Accessibility",
];
export const COMMUNITY_TOP_TIME_RANGE_ITEMS: Array<{
  id: CommunityTopTimeRange;
  label: string;
}> = [
  { id: "all-time", label: "All time" },
  { id: "past-year", label: "Past year" },
  { id: "past-month", label: "Past month" },
  { id: "past-week", label: "Past week" },
  { id: "today", label: "Today" },
  { id: "past-hour", label: "Past hour" },
];
export const COMMUNITY_APP_RAIL_WIDTH_PX = 64;
export const COMMUNITY_CONTENT_MAX_WIDTH_PX = FIT_CONTENT_MAX_WIDTH_PX;
export const COMMUNITY_TOOLBAR_CONTROL_HEIGHT_PX = 46;
export const COMMUNITY_TOOLBAR_VERTICAL_PADDING_PX = 12;
export const COMMUNITY_SIDEBAR_FLOAT_GAP_PX = 16;
export const COMMUNITY_SIDEBAR_WIDTH_PX = 224;
export const COMMUNITY_SIDEBAR_COLLAPSED_WIDTH_PX = 64;
export const COMMUNITY_DESKTOP_BREAKPOINT_PX = 1024;
export const COMMUNITY_COMPACT_MEDIA_QUERY = `(max-width: ${
  COMMUNITY_DESKTOP_BREAKPOINT_PX - 1
}px)`;
export const POST_BODY_PREVIEW_MAX_CHARS = 360;
export const POST_BODY_PREVIEW_MIN_WORD_BOUNDARY = 240;

export const COMMUNITY_IMAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "comment-images";
export const COMMENT_BUCKET = COMMUNITY_IMAGE_BUCKET;
export const MAX_COMMUNITY_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_COMMENT_IMAGE_BYTES = MAX_COMMUNITY_IMAGE_BYTES;
export const COMMUNITY_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const COMMENT_IMAGE_TYPES = COMMUNITY_IMAGE_TYPES;
export const COMMUNITY_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
export const COMMENT_IMAGE_EXTENSIONS = COMMUNITY_IMAGE_EXTENSIONS;

const now = Date.now();

export const DEMO_POSTS: SeedPost[] = [
  {
    id: "demo-quant-queen",
    user: "QuantQueen",
    initials: "QQ",
    title: "Backtesting Results: Momentum + Mean Reversion Hybrid",
    body:
      "Ran a 10-year backtest on a combined momentum and mean reversion strategy. Sharpe ratio of 2.1 with max drawdown under 15%. Details inside…",
    votes: 426,
    time: "2 days ago",
    sortTime: now - 1000 * 60 * 60 * 24 * 2,
    tags: ["Quantitative", "Backtesting", "Strategy"],
    commentCount: 117,
    avatarGradient: "linear-gradient(135deg, #4f63ff 0%, #7c3aed 100%)",
  },
  {
    id: "demo-tech-bull",
    user: "TechBull",
    initials: "TB",
    title: "Portfolio Review: My Tech-Heavy Strategy for 2026",
    body:
      "Sharing my current portfolio allocation and reasoning. 70% tech, 20% growth, 10% cash. Open to feedback and discussion.",
    votes: 312,
    time: "1 day ago",
    sortTime: now - 1000 * 60 * 60 * 24,
    tags: ["Portfolio", "Technology", "Strategy"],
    commentCount: 94,
    avatarGradient: "linear-gradient(135deg, #4f63ff 0%, #7c3aed 100%)",
  },
  {
    id: "demo-investor-pro",
    user: "InvestorPro",
    initials: "IP",
    title: "Deep Dive: Why NVDA's Valuation is Still Justified",
    body:
      "After analyzing the latest earnings report and forward guidance, I believe NVDA's current P/E ratio is sustainable given their AI dominance. Here's my analysis…",
    votes: 247,
    time: "3 hours ago",
    sortTime: now - 1000 * 60 * 60 * 3,
    tags: ["NVDA", "Analysis", "AI"],
    commentCount: 68,
    avatarGradient: "linear-gradient(135deg, #4f63ff 0%, #7c3aed 100%)",
  },
  {
    id: "demo-value-hunter",
    user: "ValueHunter",
    initials: "VH",
    title: "Small Cap Watchlist: Three Names With Strong Cash Flow",
    body:
      "Screened for low leverage, widening margins, and insider ownership. These are not recommendations, but the setup is worth a closer look.",
    votes: 189,
    time: "6 hours ago",
    sortTime: now - 1000 * 60 * 60 * 6,
    tags: ["Small Cap", "Valuation", "Watchlist"],
    commentCount: 42,
    avatarGradient: "linear-gradient(135deg, #4f63ff 0%, #7c3aed 100%)",
  },
];
