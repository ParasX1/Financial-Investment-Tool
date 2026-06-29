import type { SvgIconComponent } from "@mui/icons-material";

export type HomeRouteLink = {
  description: string;
  gated?: boolean;
  highlights?: string[];
  href: string;
  icon?: SvgIconComponent;
  label: string;
};

export type HomeFooterGroup = {
  items: Array<{
    href: string;
    label: string;
  }>;
  title: string;
};

export type HomeExperiencePoint = {
  description: string;
  icon: SvgIconComponent;
  label: string;
};
