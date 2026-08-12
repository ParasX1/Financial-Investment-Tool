import React from "react";
import { useRouter } from "next/router";
import { fetchTopPicks } from "../api/fetchTopPicks";

let topPicksPrewarmStarted = false;
const PREWARM_DELAY_MS = 30000;
const PREWARM_EXCLUDED_ROUTES = new Set(["/Portfolio", "/dashboardView"]);

export function TopPicksPrewarm() {
  const router = useRouter();
  const isTopPicksRoute = router.pathname === "/TopPicks";
  const isExcludedRoute = PREWARM_EXCLUDED_ROUTES.has(router.pathname);

  React.useEffect(() => {
    if (isTopPicksRoute || isExcludedRoute || topPicksPrewarmStarted) return;
    if (process.env.NEXT_PUBLIC_TOP_PICKS_PREWARM === "false") return;
    topPicksPrewarmStarted = true;

    const timeout = window.setTimeout(() => {
      fetchTopPicks({
        page: 1,
        pageSize: 25,
        sortKey: "sharpe",
        sortDirection: "desc",
      }).catch(() => undefined);
    }, PREWARM_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isExcludedRoute, isTopPicksRoute]);

  return null;
}
