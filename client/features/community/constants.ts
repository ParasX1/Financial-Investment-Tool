import type { SeedPost, SortMode } from "./types";

export const COMMUNITY_SORT_OPTIONS: SortMode[] = ["top", "new"];
export const COMMUNITY_PAGE_WIDTH = "min(100%, calc(100vw - 90px))";

export const COMMENT_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "comment-images";
export const MAX_COMMENT_IMAGE_BYTES = 5 * 1024 * 1024;
export const COMMENT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const COMMENT_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

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
