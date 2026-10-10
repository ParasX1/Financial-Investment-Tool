import type { PortfolioWorkspaceState } from "../types";
import { migrateWorkspaceState } from "./workspaceMigrations";

const STORAGE_VERSION = 3;

export type PortfolioWorkspaceStorage = Pick<Storage, "getItem" | "setItem">;

export const getWorkspaceStorageKey = (userId?: string) =>
  `fit.portfolioWorkspace.v${STORAGE_VERSION}.${userId ?? "guest"}`;

export const getWorkspaceStorageCandidates = (userId?: string) => [
  getWorkspaceStorageKey(userId),
  `fit.portfolioWorkspace.v2.${userId ?? "guest"}`,
  `fit.dashboardState.v1.${userId ?? "guest"}`,
  `fit.portfolioBoard.v3.${userId ?? "guest"}`,
];

export const readPortfolioWorkspace = (
  storage: PortfolioWorkspaceStorage | null,
  userId: string | undefined,
  today: string,
): PortfolioWorkspaceState | null => {
  if (!storage) return null;
  for (const key of getWorkspaceStorageCandidates(userId)) {
    try {
      const raw = storage.getItem(key);
      if (raw) return migrateWorkspaceState(JSON.parse(raw), today);
    } catch {
      // Preserve the old value for recovery and try the next known schema.
    }
  }
  return null;
};

export const writePortfolioWorkspace = (
  storage: PortfolioWorkspaceStorage | null,
  userId: string | undefined,
  workspace: PortfolioWorkspaceState,
) => {
  if (!storage) return;
  storage.setItem(getWorkspaceStorageKey(userId), JSON.stringify(workspace));
};
