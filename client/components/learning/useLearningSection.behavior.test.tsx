import * as React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { RouterContext } from "next/dist/shared/lib/router-context.shared-runtime";
import type { NextRouter } from "next/router";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { useLearningSection } from "./useLearningSection";

const sectionIds = ["overview", "alpha", "beta"] as const;

function createRouter(overrides: Partial<NextRouter> = {}) {
  return {
    isReady: true,
    pathname: "/Guide",
    query: {},
    replace: jest.fn<NextRouter["replace"]>().mockResolvedValue(true),
    ...overrides,
  } as unknown as NextRouter;
}

async function renderHarness(initialRouter: NextRouter) {
  let router = initialRouter;
  let latest: ReturnType<typeof useLearningSection> | null = null;
  let renderer!: ReactTestRenderer;

  function Probe() {
    latest = useLearningSection(sectionIds, "overview");
    return null;
  }

  function Tree() {
    return (
      <RouterContext.Provider value={router}>
        <Probe />
      </RouterContext.Provider>
    );
  }

  await act(async () => {
    renderer = TestRenderer.create(<Tree />);
  });

  return {
    get latest() {
      return latest!;
    },
    async updateRouter(nextRouter: NextRouter) {
      router = nextRouter;
      await act(async () => {
        renderer.update(<Tree />);
      });
    },
    unmount() {
      act(() => renderer.unmount());
    },
  };
}

describe("useLearningSection router behavior", () => {
  it("follows valid deep links and later browser history changes", async () => {
    const replace = jest
      .fn<NextRouter["replace"]>()
      .mockResolvedValue(true);
    const harness = await renderHarness(
      createRouter({ query: { section: "beta" }, replace } as Partial<NextRouter>),
    );

    expect(harness.latest.activeId).toBe("beta");
    expect(replace).not.toHaveBeenCalled();

    await harness.updateRouter(
      createRouter({ query: { section: "alpha" }, replace } as Partial<NextRouter>),
    );
    expect(harness.latest.activeId).toBe("alpha");
    harness.unmount();
  });

  it.each(["unknown", ["beta", "alpha"]])(
    "cleans an invalid section query while preserving other route state: %p",
    async (section) => {
      const replace = jest
        .fn<NextRouter["replace"]>()
        .mockResolvedValue(true);
      const harness = await renderHarness(
        createRouter({
          query: { campaign: "learning", section },
          replace,
        } as Partial<NextRouter>),
      );

      expect(harness.latest.activeId).toBe("overview");
      expect(replace).toHaveBeenCalledWith(
        {
          pathname: "/Guide",
          query: { campaign: "learning" },
        },
        undefined,
        { shallow: true, scroll: false },
      );
      harness.unmount();
    },
  );

  it("preserves unrelated query state when selecting a valid section", async () => {
    const replace = jest
      .fn<NextRouter["replace"]>()
      .mockResolvedValue(true);
    const harness = await renderHarness(
      createRouter({
        query: { campaign: "learning", section: "alpha" },
        replace,
      } as Partial<NextRouter>),
    );

    act(() => harness.latest.selectSection("beta"));
    expect(harness.latest.activeId).toBe("beta");
    expect(replace).toHaveBeenLastCalledWith(
      {
        pathname: "/Guide",
        query: { campaign: "learning", section: "beta" },
      },
      undefined,
      { shallow: true, scroll: false },
    );

    act(() => harness.latest.selectSection("not-a-section"));
    expect(replace).toHaveBeenCalledTimes(1);
    harness.unmount();
  });

  it("waits for the Pages Router before reading or rewriting query state", async () => {
    const replace = jest
      .fn<NextRouter["replace"]>()
      .mockResolvedValue(true);
    const harness = await renderHarness(
      createRouter({
        isReady: false,
        query: { section: "beta" },
        replace,
      } as Partial<NextRouter>),
    );

    expect(harness.latest.activeId).toBe("overview");
    expect(replace).not.toHaveBeenCalled();
    harness.unmount();
  });
});
