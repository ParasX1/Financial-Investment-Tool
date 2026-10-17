export type HomeEntryDestination =
  | "/Portfolio"
  | "/TopPicks"
  | "/Watchlist"
  | "/MarketNews"
  | "/Community";

export type HomeRouteLink = {
  readonly description: string;
  readonly gated?: boolean;
  readonly href: HomeEntryDestination;
  readonly label: string;
};

export type HomeEntryActions = {
  authLoading: boolean;
  signedIn: boolean;
  onRouteSelect: (route: HomeRouteLink) => void;
};

export type HomeFooterGroup = {
  readonly items: ReadonlyArray<{
    readonly href: string;
    readonly label: string;
  }>;
  readonly title: string;
};
