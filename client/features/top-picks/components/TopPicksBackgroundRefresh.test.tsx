import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { subscribeToTopPicksUpdates } from "../api/subscribeToTopPicksUpdates";

const mockSubscribe = jest.fn<typeof subscribeToTopPicksUpdates>();
const mockUnsubscribe = jest.fn<() => void>();
let mockAuthState = {
  loading: false,
  user: null as { id: string } | null,
};
let TopPicksBackgroundRefresh: (typeof import("./TopPicksBackgroundRefresh"))["TopPicksBackgroundRefresh"];
let renderer: ReactTestRenderer | undefined;
const flags = [
  "NEXT_PUBLIC_TOP_PICKS_BACKGROUND_REFRESH",
  "NEXT_PUBLIC_TOP_PICKS_PREWARM",
] as const;
const originalFlags = flags.map((key) => process.env[key]);

function AppProbe({ page }: { page: string }) {
  return (
    <>
      <TopPicksBackgroundRefresh />
      <main>{page}</main>
    </>
  );
}

describe("TopPicksBackgroundRefresh", () => {
  beforeAll(() => {
    jest.doMock("@/features/auth", () => ({
      useAuth: () => mockAuthState,
    }));
    jest.doMock("../api/subscribeToTopPicksUpdates", () => ({
      subscribeToTopPicksUpdates: mockSubscribe,
    }));
    TopPicksBackgroundRefresh =
      require("./TopPicksBackgroundRefresh").TopPicksBackgroundRefresh;
  });

  beforeEach(() => {
    mockAuthState = { loading: false, user: null };
    mockSubscribe.mockReset().mockReturnValue(mockUnsubscribe);
    mockUnsubscribe.mockReset();
    flags.forEach((key) => delete process.env[key]);
  });

  afterEach(() => {
    act(() => renderer?.unmount());
    renderer = undefined;
    flags.forEach((key, index) => {
      const value = originalFlags[index];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  });

  it("waits for auth hydration then keeps refreshing for a signed-out visitor", async () => {
    mockAuthState.loading = true;
    await act(async () => {
      renderer = TestRenderer.create(<AppProbe page="Home" />);
    });
    expect(mockSubscribe).not.toHaveBeenCalled();

    mockAuthState.loading = false;
    await act(async () => {
      renderer!.update(<AppProbe page="Home" />);
    });
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ window: "1Y" }),
    );
  });

  it("keeps the app subscription across pages and account changes", async () => {
    await act(async () => {
      renderer = TestRenderer.create(<AppProbe page="Portfolio" />);
    });

    for (const page of ["dashboardView", "TopPicks", "Guide"]) {
      mockAuthState.user = { id: page };
      await act(async () => {
        renderer!.update(<AppProbe page={page} />);
      });
    }

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();
    const { onUpdate, onRefreshError } = mockSubscribe.mock.calls[0][0];
    await act(async () => {
      onUpdate();
      onRefreshError();
    });
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(renderer!.toJSON()).toEqual({
      type: "main",
      props: {},
      children: ["Guide"],
    });
  });

  it("releases the stream on app unmount and starts again on remount", async () => {
    await act(async () => {
      renderer = TestRenderer.create(<AppProbe page="Guide" />);
    });
    await act(async () => {
      renderer!.unmount();
      renderer = undefined;
    });
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer = TestRenderer.create(<AppProbe page="Guide" />);
    });
    expect(mockSubscribe).toHaveBeenCalledTimes(2);
  });

  it.each(flags)("respects the background opt-out %s", async (key) => {
    process.env[key] = "false";
    await act(async () => {
      renderer = TestRenderer.create(<AppProbe page="Guide" />);
    });
    expect(mockSubscribe).not.toHaveBeenCalled();
  });
});
