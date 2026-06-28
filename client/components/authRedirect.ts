const DEFAULT_AUTH_REDIRECT_PATH = "/dashboardView";

export function buildAuthRedirectTo(
  origin: string,
  redirectTo = DEFAULT_AUTH_REDIRECT_PATH,
) {
  const safePath =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : DEFAULT_AUTH_REDIRECT_PATH;

  return `${origin}${safePath}`;
}
