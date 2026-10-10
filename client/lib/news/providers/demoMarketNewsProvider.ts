import type { Article } from "@/lib/news/contracts";
import { compact, dedupeArticles } from "../providerUtils";
import type { ServerNewsRequest } from "../types";

type DemoStoryInput = {
  id: string;
  title: string;
  summary: string;
  source: string;
  relatedSymbols?: string[];
};

const DEMO_STORIES_BY_TOPIC: Record<string, readonly DemoStoryInput[]> = {
  "cost-of-living": [
    {
      id: "cost-rates-households",
      relatedSymbols: ["CBA.AX", "WOW.AX"],
      source: "FIT Demo Desk",
      summary:
        "Mortgage pressure, grocery prices, and wage growth remain the fastest signals for household spending risk.",
      title:
        "Household budgets stay under pressure as investors watch rates and retail margins",
    },
    {
      id: "cost-inflation-basket",
      relatedSymbols: ["COL.AX", "WES.AX"],
      source: "FIT Demo Desk",
      summary:
        "A tighter spending basket can shift earnings expectations for supermarkets, banks, and discretionary retailers.",
      title:
        "Cost basket check: food, fuel, and rent keep consumer names in focus",
    },
    {
      id: "cost-rba-income",
      relatedSymbols: ["AUDUSD=X", "^AXJO"],
      source: "FIT Demo Desk",
      summary:
        "Rate expectations remain a useful bridge between household finance headlines and market positioning.",
      title:
        "RBA path keeps income-sensitive sectors on the investor watchlist",
    },
  ],
  "australian-markets": [
    {
      id: "au-market-open",
      relatedSymbols: ["^AORD", "^AXJO", "BHP.AX"],
      source: "FIT Demo Desk",
      summary:
        "Banks, miners, and the Australian dollar set the tone for local portfolio moves.",
      title: "ASX watch: banks and miners shape the local market lead",
    },
    {
      id: "au-earnings-watch",
      relatedSymbols: ["CBA.AX", "WOW.AX"],
      source: "FIT Demo Desk",
      summary:
        "Investors are scanning for earnings revisions and balance-sheet sensitivity across domestic leaders.",
      title:
        "Australian blue chips draw attention before the next earnings window",
    },
  ],
  "international-markets": [
    {
      id: "global-macro",
      relatedSymbols: ["^GSPC", "^IXIC", "^FTSE"],
      source: "FIT Demo Desk",
      summary:
        "US tech, European rates, and Asian demand are the cross-market inputs most likely to affect local portfolios.",
      title: "Global market setup: Wall Street leads, Asia liquidity in focus",
    },
    {
      id: "global-risk",
      relatedSymbols: ["^VIX", "AUDUSD=X"],
      source: "FIT Demo Desk",
      summary:
        "Currency and volatility moves can change offshore exposure even before headline index levels move.",
      title: "Risk gauge rises as investors reassess offshore equity exposure",
    },
  ],
  commodities: [
    {
      id: "commodity-oil-gold",
      relatedSymbols: ["CL=F", "GC=F", "BHP.AX"],
      source: "FIT Demo Desk",
      summary:
        "Energy and precious metals remain the quickest commodity read-throughs for inflation and resource earnings.",
      title: "Oil and gold moves keep inflation and resource margins in view",
    },
    {
      id: "commodity-copper",
      relatedSymbols: ["HG=F", "RIO.AX"],
      source: "FIT Demo Desk",
      summary:
        "Copper remains a practical signal for industrial demand and China-sensitive Australian exposures.",
      title: "Copper signal improves as investors watch industrial demand",
    },
  ],
  "money-news": [
    {
      id: "money-tax-super",
      relatedSymbols: ["CBA.AX", "NAB.AX"],
      source: "FIT Demo Desk",
      summary:
        "Tax, superannuation, and bank product changes can affect household cash flow and long-term allocations.",
      title: "Money watch: tax settings and super balances stay front of mind",
    },
  ],
  "personal-finance": [
    {
      id: "personal-finance-mortgage",
      relatedSymbols: ["CBA.AX", "ANZ.AX"],
      source: "FIT Demo Desk",
      summary:
        "Mortgage repricing and savings rates remain important for household resilience and bank margin expectations.",
      title:
        "Mortgage resets keep personal finance decisions tied to market rates",
    },
  ],
  "property-news": [
    {
      id: "property-rents",
      relatedSymbols: ["REA.AX", "CBA.AX"],
      source: "FIT Demo Desk",
      summary:
        "Rents, listings, and borrowing capacity are the cleanest signals for housing-linked portfolio risk.",
      title:
        "Property pulse: listings and rent pressure guide housing sentiment",
    },
  ],
  work: [
    {
      id: "work-wages",
      relatedSymbols: ["^AXJO", "AUDUSD=X"],
      source: "FIT Demo Desk",
      summary:
        "Wage growth and job openings shape both household income and central bank expectations.",
      title: "Labour market data keeps wages and rate expectations connected",
    },
  ],
  technology: [
    {
      id: "tech-ai-platforms",
      relatedSymbols: ["NVDA", "MSFT", "TEAM"],
      source: "FIT Demo Desk",
      summary:
        "AI infrastructure, software margins, and platform spending remain the main tech market narratives.",
      title: "AI infrastructure keeps technology shares on investor screens",
    },
    {
      id: "tech-cyber",
      relatedSymbols: ["TEAM", "CRWD"],
      source: "FIT Demo Desk",
      summary:
        "Cybersecurity and enterprise software demand are useful checks on risk appetite in growth portfolios.",
      title:
        "Enterprise software demand steadies as investors compare quality growth",
    },
  ],
};

const DEFAULT_DEMO_STORIES = DEMO_STORIES_BY_TOPIC["australian-markets"]!;
const DEMO_BASE_TIME = Date.UTC(2026, 5, 16, 4, 0, 0);

function resolveDemoStories(request: ServerNewsRequest) {
  if (request.kind === "ticker" && request.ticker) {
    const symbol = compact(request.ticker).toUpperCase();
    return [
      {
        id: `ticker-${symbol}`,
        relatedSymbols: [symbol],
        source: "FIT Demo Desk",
        summary:
          "Ticker-specific demo coverage keeps the drill-down usable while a live finance news provider is not configured.",
        title: `${symbol} watch: latest portfolio-relevant headlines will appear here`,
      },
    ];
  }

  if (request.kind === "search" && request.query && request.userSearch) {
    const query = compact(request.query);
    return [
      {
        id: `search-${query.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        relatedSymbols: [],
        source: "FIT Demo Desk",
        summary:
          "Search demo results preserve the active category context while a live provider key is missing.",
        title: `Demo search result for "${query}"`,
      },
      ...(DEMO_STORIES_BY_TOPIC[request.topicId ?? ""] ?? DEFAULT_DEMO_STORIES),
    ];
  }

  return DEMO_STORIES_BY_TOPIC[request.topicId ?? ""] ?? DEFAULT_DEMO_STORIES;
}

export function getDemoMarketNewsArticles(
  request: ServerNewsRequest,
): Article[] {
  return dedupeArticles(
    resolveDemoStories(request).map((story, index) => ({
      id: `demo-${story.id}`,
      image: null,
      provider: "demo",
      providerLabel: "Demo",
      publishedAt: new Date(
        DEMO_BASE_TIME - index * 45 * 60 * 1000,
      ).toISOString(),
      relatedSymbols: story.relatedSymbols ?? [],
      source: story.source,
      summary: story.summary,
      title: story.title,
      url: `#demo-market-news-${story.id}`,
    })),
  );
}
