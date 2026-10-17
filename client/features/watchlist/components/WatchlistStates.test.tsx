import { renderToStaticMarkup } from "react-dom/server";
import {
  WatchlistEmptyState,
  WatchlistLoadError,
  WatchlistLoadingState,
  WatchlistSignedOut,
} from "./WatchlistStates";

describe("watchlist page states", () => {
  it("announces loading and offers recovery/account actions", () => {
    const loading = renderToStaticMarkup(<WatchlistLoadingState />);
    const error = renderToStaticMarkup(
      <WatchlistLoadError message="We couldn't load your watchlist." onRetry={() => undefined} />,
    );
    const signedOut = renderToStaticMarkup(
      <WatchlistSignedOut onCreateAccount={() => undefined} onSignIn={() => undefined} />,
    );
    const empty = renderToStaticMarkup(<WatchlistEmptyState />);

    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("Loading your watchlist…");
    expect(error).toContain('role="alert"');
    expect(error).toContain("Try again");
    expect(signedOut).toContain("Sign in to save a watchlist");
    expect(signedOut).toContain("Create account");
    expect(empty).toContain("Build your research shortlist");
    expect(empty).toContain("not a buy recommendation");
  });
});
import { describe, expect, it } from "@jest/globals";
