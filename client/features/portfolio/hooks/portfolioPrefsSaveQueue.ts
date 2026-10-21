import { createLatestWriteQueue } from "@/lib/latestWriteQueue";
import { savePortfolioConfig } from "../data/portfolioPrefs";

type PortfolioPrefsSaveRequest = {
  scopeKey: string;
  userId: string;
  prefs: Parameters<typeof savePortfolioConfig>[1];
  onSuccess: (isLatest: boolean) => void;
  onError: (isLatest: boolean) => void;
};

export const portfolioPrefsSaveQueue =
  createLatestWriteQueue<PortfolioPrefsSaveRequest>((request) =>
    savePortfolioConfig(request.userId, request.prefs),
  );
