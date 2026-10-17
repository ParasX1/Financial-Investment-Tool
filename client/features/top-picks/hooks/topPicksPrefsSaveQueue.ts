import { createLatestWriteQueue } from "@/lib/latestWriteQueue";
import { saveTopPicksPrefs } from "../data/topPicksPrefsRepository";
import type { TopPicksPrefs } from "../types";

export type TopPicksPrefsSaveRequest = {
  scopeKey: string;
  userId: string;
  prefs: TopPicksPrefs;
  onSuccess: (isLatest: boolean) => void;
  onError: () => void;
};

export const topPicksPrefsSaveQueue =
  createLatestWriteQueue<TopPicksPrefsSaveRequest>((request) =>
    saveTopPicksPrefs(request.userId, request.prefs),
  );
