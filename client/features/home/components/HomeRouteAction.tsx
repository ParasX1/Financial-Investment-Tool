import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import Link from "next/link";
import type { HomeRouteLink } from "../types";

/** Keep destination, session loading and sign-in semantics consistent. */
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
  const requiresSignIn = Boolean(route.gated && !signedIn);
  const content = (
    <>
      {children ?? label}
      <KeyboardArrowRightRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
    </>
  );

  return requiresSignIn ? (
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
