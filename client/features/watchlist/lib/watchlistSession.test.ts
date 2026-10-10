import { describe, expect, it } from "@jest/globals";
import { createWatchlistSessionGuard } from "./watchlistSession";

describe("watchlist session guard", () => {
  it("invalidates an in-flight operation after sign-out or account switch", () => {
    const guard = createWatchlistSessionGuard("user-a");
    const userAOperation = guard.capture();

    expect(guard.isCurrent(userAOperation)).toBe(true);
    guard.sync(null);
    expect(guard.isCurrent(userAOperation)).toBe(false);

    guard.sync("user-b");
    const userBOperation = guard.capture();
    expect(guard.isCurrent(userAOperation)).toBe(false);
    expect(guard.isCurrent(userBOperation)).toBe(true);
  });

  it("keeps the generation stable when the same user renders again", () => {
    const guard = createWatchlistSessionGuard("user-a");
    const operation = guard.capture();

    guard.sync("user-a");
    expect(guard.isCurrent(operation)).toBe(true);
  });
});
