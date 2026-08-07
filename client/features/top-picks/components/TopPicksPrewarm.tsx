import React from "react";
import { useRouter } from "next/router";
import { fetchTopPicks } from "../api/fetchTopPicks";

let topPicksPrewarmStarted = false;

export function TopPicksPrewarm() {
  const router = useRouter();
  const isTopPicksRoute = router.pathname === "/TopPicks";

  React.useEffect(() => {
    if (isTopPicksRoute || topPicksPrewarmStarted) return;
    topPicksPrewarmStarted = true;

    fetchTopPicks({
      page: 1,
      pageSize: 25,
      sortKey: "sharpe",
      sortDirection: "desc",
    }).catch(() => undefined);
  }, [isTopPicksRoute]);

  return null;
}
