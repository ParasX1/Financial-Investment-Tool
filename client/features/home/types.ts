export type HomeEntryDestination =
  | "/Portfolio"
  | "/Watchlist"
  | "/MarketNews"
  | "/Community";

export type HomeRouteLink = {
  readonly description: string;
  readonly gated?: boolean;
  readonly href: HomeEntryDestination;
  readonly label: string;
};

export type HomeFooterGroup = {
  readonly items: ReadonlyArray<{
    readonly href: string;
    readonly label: string;
  }>;
  readonly title: string;
};

export type HomeExperiencePoint = {
  readonly description: string;
  readonly label: string;
};
