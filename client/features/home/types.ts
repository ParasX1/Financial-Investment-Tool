import type { SvgIconComponent } from "@mui/icons-material";

export type HomeEntryDestination =
  | "/dashboardView"
  | "/MarketNews"
  | "/Community";

export type HomeRouteLink = {
  readonly description: string;
  readonly gated?: boolean;
  readonly highlights?: readonly string[];
  readonly href: HomeEntryDestination;
  readonly icon?: SvgIconComponent;
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
  readonly icon: SvgIconComponent;
  readonly label: string;
};
