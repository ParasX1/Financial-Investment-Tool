import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Link from "next/link";
import type { HomeRouteLink } from "../types";

/** Share destination, loading and sign-in semantics across both entry surfaces. */
export function HomeRouteAction({
  route,
  label,
  className,
  authLoading,
  signedIn,
  children,
  onRouteSelect,
}: {
  route: HomeRouteLink;
  label: string;
  className: string;
  authLoading: boolean;
  signedIn: boolean;
  children?: React.ReactNode;
  onRouteSelect: (route: HomeRouteLink) => void;
}) {
  const locked = Boolean(route.gated && !signedIn);
  const content = (
    <>
      {children ?? label}
      {locked ? (
        <LockOutlinedIcon sx={{ fontSize: 14 }} aria-hidden="true" />
      ) : null}
      <KeyboardArrowRightRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
    </>
  );

  return locked ? (
    <button
      type="button"
      className={className}
      aria-label={`${label}, sign in required`}
      disabled={authLoading}
      onClick={() => onRouteSelect(route)}
    >
      {content}
    </button>
  ) : (
    <Link href={route.href} className={className} aria-label={label}>
      {content}
    </Link>
  );
}
