import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { ElementType } from "react";

export type LearningIcon = ElementType<SvgIconProps>;

export interface LearningNavItem {
  id: string;
  label: string;
  description: string;
  icon: LearningIcon;
}
