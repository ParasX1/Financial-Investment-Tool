import { useAuth } from "@/features/auth";
import { useEffect } from "react";
import { subscribeToTopPicksUpdates } from "../api/subscribeToTopPicksUpdates";

const ignoreNotification = () => {};

export function TopPicksBackgroundRefresh() {
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    if (
      authLoading ||
      process.env.NEXT_PUBLIC_TOP_PICKS_BACKGROUND_REFRESH === "false" ||
      process.env.NEXT_PUBLIC_TOP_PICKS_PREWARM === "false"
    ) {
      return;
    }

    // The shared subscription keeps the server refreshing and saving all
    // windows across route changes. Only an open table reads the new rows.
    return subscribeToTopPicksUpdates({
      window: "1Y",
      onUpdate: ignoreNotification,
      onRefreshError: ignoreNotification,
    });
  }, [authLoading]);

  return null;
}
