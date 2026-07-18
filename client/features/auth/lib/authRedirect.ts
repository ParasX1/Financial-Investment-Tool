const DEFAULT_AUTH_REDIRECT_PATH = "/dashboardView";
const SAFE_BASE_URL = "https://fit.local";

export function getSafeAuthRedirectPath(
  redirectTo = DEFAULT_AUTH_REDIRECT_PATH,
) {
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }

  try {
    const candidate = new URL(redirectTo, SAFE_BASE_URL);
    if (candidate.origin !== SAFE_BASE_URL) return DEFAULT_AUTH_REDIRECT_PATH;
    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }
}

export function buildAuthRedirectTo(
  origin: string,
  redirectTo = DEFAULT_AUTH_REDIRECT_PATH,
) {
  return new URL(getSafeAuthRedirectPath(redirectTo), origin).toString();
}
