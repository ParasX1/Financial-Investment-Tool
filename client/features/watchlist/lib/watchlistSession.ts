export type WatchlistSessionToken = {
  generation: number;
  userId: string | null;
};

export function createWatchlistSessionGuard(initialUserId: string | null) {
  let current: WatchlistSessionToken = {
    generation: 0,
    userId: initialUserId,
  };

  return {
    capture(): WatchlistSessionToken {
      return { ...current };
    },
    isCurrent(token: WatchlistSessionToken): boolean {
      return (
        token.generation === current.generation &&
        token.userId === current.userId
      );
    },
    sync(userId: string | null): void {
      if (userId === current.userId) return;
      current = { generation: current.generation + 1, userId };
    },
  };
}

export type WatchlistSessionGuard = ReturnType<
  typeof createWatchlistSessionGuard
>;
