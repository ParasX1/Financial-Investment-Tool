import type { SvgIconComponent } from "@mui/icons-material";

export type HomeNavItem = {
  href: `#${string}`;
  id: string;
  label: string;
};

export type HomeRouteLink = {
  description: string;
  gated?: boolean;
  href: string;
  icon?: SvgIconComponent;
  label: string;
};

export type HomeExperiencePoint = {
  description: string;
  icon: SvgIconComponent;
  label: string;
};
