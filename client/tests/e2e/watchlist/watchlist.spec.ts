import { expect, test } from "@playwright/test";
import { WatchlistPage } from "./WatchlistPage";
import { installWatchlistMockBackend } from "./watchlistMockBackend";

test("explains the signed-out state without overflowing on a student-sized screen", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  const watchlist = new WatchlistPage(page);

  await watchlist.goto();

  await expect(
    page.getByRole("heading", { name: "Sign in to save a watchlist" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Sign in" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("persists the beginner research queue through add, edit, reorder, and remove", async ({
  page,
}) => {
  const backend = await installWatchlistMockBackend(page);
  const watchlist = new WatchlistPage(page);

  await watchlist.goto();
  await expect(
    page.getByRole("heading", { name: "My Research List" }),
  ).toBeVisible();

  await watchlist.addCompany("wesfarmers", "WES.AX");
  await watchlist.editResearch(
    "WES.AX",
    "Compare the next result with retail peers.",
    "42.50",
  );

  await page.getByRole("button", { name: "Move WES.AX up" }).click();
  await page.getByRole("button", { name: "Move WES.AX up" }).click();
  await watchlist.remove("BHP.AX");

  expect(backend.rows().map((row) => row.symbol)).toEqual(["WES.AX", "CBA.AX"]);
  expect(backend.rows()[0]).toMatchObject({
    note: "Compare the next result with retail peers.",
    target_price: 42.5,
  });

  await page.reload();
  await expect(
    page.getByText("Compare the next result with retail peers."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit BHP.AX research note" }),
  ).toHaveCount(0);
});

test("keeps available prices visible when one saved ticker has no quote", async ({
  page,
}) => {
  await installWatchlistMockBackend(page, { unavailableSymbols: ["BHP.AX"] });
  const watchlist = new WatchlistPage(page);

  await watchlist.goto();

  const cbaRow = page
    .getByRole("button", { name: "Edit CBA.AX research note" })
    .locator("xpath=ancestor::article");
  const bhpRow = page
    .getByRole("button", { name: "Edit BHP.AX research note" })
    .locator("xpath=ancestor::article");

  await expect(cbaRow).toContainText("$120.20");
  await expect(bhpRow).toContainText("Quote unavailable");
  await expect(
    page.getByText("Some quotes are temporarily unavailable."),
  ).toBeVisible();
});

test("compares saved symbols across ranges and dismisses routine success feedback", async ({
  page,
}) => {
  const backend = await installWatchlistMockBackend(page);
  const watchlist = new WatchlistPage(page);

  await watchlist.goto();
  await expect(
    page.getByRole("heading", { name: "CBA.AX Market Monitor" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add BHP.AX to comparison" }).click();

  await expect(
    page.getByRole("heading", { name: "Market comparison" }),
  ).toBeVisible();
  await expect(page.getByTestId("comparison-line-CBA.AX")).toBeVisible();
  await expect(page.getByTestId("comparison-line-BHP.AX")).toBeVisible();
  await expect(page.getByText(/Each line starts at 0%/)).toBeVisible();

  await page.getByRole("button", { exact: true, name: "3M" }).click();
  await expect(
    page.getByRole("button", { exact: true, name: "3M" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => backend.chartRequests())
    .toContainEqual({
      range: "3m",
      symbols: ["CBA.AX", "BHP.AX"],
    });

  await watchlist.addCompany("wesfarmers", "WES.AX");
  await expect(
    page.getByText("WES.AX was added to your watchlist."),
  ).toBeVisible();
  await expect(
    page.getByText("WES.AX was added to your watchlist."),
  ).toBeHidden({
    timeout: 6_000,
  });
});

for (const action of ["edit", "remove"] as const) {
  test(`clears account A's ${action} dialog while account B's watchlist is pending or fails`, async ({
    page,
  }) => {
    await installWatchlistMockBackend(page);
    const watchlist = new WatchlistPage(page);
    const userB = "22222222-2222-4222-8222-222222222222";
    const savedNote = "Private account A saved research.";
    const draftNote = "Private account A unsaved draft.";
    let releaseLoad!: () => void;
    let startedLoad!: () => void;
    const pendingLoad = new Promise<void>((resolve) => {
      releaseLoad = resolve;
    });
    const loadStarted = new Promise<void>((resolve) => {
      startedLoad = resolve;
    });
    let failLoad = true;
    const writes: string[] = [];

    await page.route(
      "https://watchlist-e2e.supabase.co/rest/v1/user_watchlist?*",
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (
          request.method() === "OPTIONS" ||
          url.searchParams.get("user_id") !== `eq.${userB}`
        ) {
          await route.fallback();
          return;
        }
        if (request.method() !== "GET") {
          writes.push(request.method());
          await route.fallback();
          return;
        }
        startedLoad();
        await pendingLoad;
        await route.fulfill({
          body: JSON.stringify(
            failLoad
              ? { message: "Account B mock load failed." }
              : [
                  {
                    ...createAccountBRow(),
                    user_id: userB,
                  },
                ],
          ),
          headers: {
            "access-control-allow-origin": "*",
            "content-type": "application/json",
          },
          status: failLoad ? 500 : 200,
        });
      },
    );

    function createAccountBRow() {
      return {
        created_at: "2026-07-15T00:00:00.000Z",
        note: "Account B saved research.",
        position: 0,
        symbol: "CBA.AX",
        target_price: 99,
        updated_at: "2026-07-15T00:00:00.000Z",
      };
    }

    await watchlist.goto();
    await watchlist.editResearch("CBA.AX", savedNote, "120");
    await page
      .getByRole("button", {
        name:
          action === "edit"
            ? "Edit CBA.AX research note"
            : "Remove CBA.AX from watchlist",
      })
      .click();
    if (action === "edit") {
      await page.getByLabel("Why are you watching this?").fill(draftNote);
    }
    await expect(page.getByRole("dialog")).toBeVisible();

    // Use the installed Supabase client's cross-tab auth event contract with mock sessions.
    await page.evaluate((userId) => {
      const storageKey = "sb-watchlist-e2e-auth-token";
      const session = JSON.parse(window.localStorage.getItem(storageKey)!);
      session.user = {
        ...session.user,
        email: "account-b@example.test",
        id: userId,
      };
      session.access_token = "watchlist-e2e-account-b-access-token";
      window.localStorage.setItem(storageKey, JSON.stringify(session));
      const channel = new BroadcastChannel(storageKey);
      channel.postMessage({ event: "SIGNED_IN", session });
      channel.close();
    }, userB);

    await loadStarted;
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(savedNote, { exact: true })).toHaveCount(0);
    await expect(page.locator("textarea")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Edit CBA.AX research note" }),
    ).toHaveCount(0);

    releaseLoad();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(writes).toEqual([]);

    failLoad = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(
      page.getByText("Account B saved research.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Edit CBA.AX research note" })
      .click();
    await expect(page.getByLabel("Why are you watching this?")).toHaveValue(
      "Account B saved research.",
    );
    await expect(page.getByLabel("Optional research target")).toHaveValue("99");
    expect(writes).toEqual([]);
  });
}
