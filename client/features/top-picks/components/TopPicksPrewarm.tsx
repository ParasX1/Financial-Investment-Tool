import React from "react";
import { useRouter } from "next/router";
import { fetchTopPicks } from "../api/fetchTopPicks";

let topPicksPrewarmStarted = false;
const PREWARM_DELAY_MS = 5000;

export function TopPicksPrewarm() {
  const router = useRouter();
  const isTopPicksRoute = router.pathname === "/TopPicks";

  React.useEffect(() => {
    if (isTopPicksRoute || topPicksPrewarmStarted) return;
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
  }, [isTopPicksRoute]);

  return null;
}
