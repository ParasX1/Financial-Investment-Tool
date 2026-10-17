import * as React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import TestRenderer, { act } from "react-test-renderer";
import type { HomeRouteLink } from "../types";
import { useHomeEntryController } from "./useHomeEntryController";

const navigate = jest.fn<(href: string) => Promise<boolean>>();

const marketNewsRoute: HomeRouteLink = {
  description: "Market context",
  gated: true,
  href: "/MarketNews",
  label: "Market News",
};

const communityRoute: HomeRouteLink = {
  description: "Discuss ideas",
  gated: true,
  href: "/Community",
  label: "Community",
};

const watchlistRoute: HomeRouteLink = {
  description: "Keep companies and research notes together",
  gated: true,
  href: "/Watchlist",
  label: "Watchlist",
};

function renderController({
  loading = false,
  signedIn = false,
}: {
  loading?: boolean;
  signedIn?: boolean;
}) {
  let latest!: ReturnType<typeof useHomeEntryController>;

  function Probe() {
    latest = useHomeEntryController({
      authLoading: loading,
      navigate,
      signedIn,
    });
    return null;
  }

  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<Probe />);
  });

  return {
    get latest() {
      return latest;
    },
    renderer,
  };
}

describe("useHomeEntryController", () => {
  beforeEach(() => {
    navigate.mockReset();
    navigate.mockResolvedValue(true);
  });

  it("preserves a gated destination while closing and reopening auth", () => {
    const harness = renderController({});

    act(() => harness.latest.selectRoute(marketNewsRoute));
    expect(harness.latest.authDialog).toBe("login");
    expect(harness.latest.redirectTo).toBe("/MarketNews");

    act(() => harness.latest.closeAuthDialog());
    expect(harness.latest.authDialog).toBeNull();
    expect(harness.latest.redirectTo).toBe("/MarketNews");

    act(() => harness.latest.openSignUp("/MarketNews"));
    expect(harness.latest.authDialog).toBe("signup");
    expect(harness.latest.redirectTo).toBe("/MarketNews");
    expect(navigate).not.toHaveBeenCalled();

    act(() => harness.renderer.unmount());
  });

  it("opens create-account entry in signup with the default destination", () => {
    const harness = renderController({});

    act(() => harness.latest.openSignUp());

    expect(harness.latest.authDialog).toBe("signup");
    expect(harness.latest.redirectTo).toBe("/Portfolio");

    act(() => harness.renderer.unmount());
  });

  it("preserves Watchlist intent through closing and switching auth entry mode", () => {
    const harness = renderController({});
    act(() => harness.latest.selectRoute(watchlistRoute));
    expect(harness.latest.authDialog).toBe("login");
    expect(harness.latest.redirectTo).toBe("/Watchlist");
    act(() => harness.latest.closeAuthDialog());
    act(() => harness.latest.openSignUp("/Watchlist"));
    expect(harness.latest.authDialog).toBe("signup");
    expect(harness.latest.redirectTo).toBe("/Watchlist");
    expect(navigate).not.toHaveBeenCalled();
    act(() => harness.renderer.unmount());
  });

  it("routes restored users to Watchlist and ignores Watchlist while loading", () => {
    const loading = renderController({ loading: true });
    act(() => loading.latest.selectRoute(watchlistRoute));
    expect(loading.latest.authDialog).toBeNull();
    expect(loading.latest.redirectTo).toBe("/Portfolio");
    expect(navigate).not.toHaveBeenCalled();
    act(() => loading.renderer.unmount());
    const restored = renderController({ signedIn: true });
    act(() => restored.latest.selectRoute(watchlistRoute));
    expect(navigate).toHaveBeenCalledWith("/Watchlist");
    expect(restored.latest.authDialog).toBeNull();
    act(() => restored.renderer.unmount());
  });

  it("routes signed-in users directly to their selected destination", () => {
    const harness = renderController({ signedIn: true });

    act(() => harness.latest.selectRoute(communityRoute));

    expect(navigate).toHaveBeenCalledWith("/Community");
    expect(harness.latest.authDialog).toBeNull();

    act(() => harness.renderer.unmount());
  });

  it("ignores entry actions while authentication is loading", () => {
    const harness = renderController({ loading: true });

    act(() => {
      harness.latest.openLogin();
      harness.latest.openSignUp();
      harness.latest.selectRoute(marketNewsRoute);
    });

    expect(harness.latest.authDialog).toBeNull();
    expect(harness.latest.redirectTo).toBe("/Portfolio");
    expect(navigate).not.toHaveBeenCalled();

    act(() => harness.renderer.unmount());
  });
});
