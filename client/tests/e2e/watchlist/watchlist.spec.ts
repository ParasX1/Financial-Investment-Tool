import { expect, test } from "@playwright/test";
import { WatchlistPage } from "./WatchlistPage";
import { installWatchlistMockBackend } from "./watchlistMockBackend";

test("explains the signed-out state without overflowing on a student-sized screen", async ({ page }) => {
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
    await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("persists the beginner research queue through add, edit, reorder, and remove", async ({ page }) => {
  const backend = await installWatchlistMockBackend(page);
  const watchlist = new WatchlistPage(page);

  await watchlist.goto();
  await expect(page.getByRole("heading", { name: "My Research List" })).toBeVisible();

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
  await expect(page.getByText("Compare the next result with retail peers.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit BHP.AX research note" }),
  ).toHaveCount(0);
});

test("keeps available prices visible when one saved ticker has no quote", async ({ page }) => {
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

  await page
    .getByRole("button", { name: "Add BHP.AX to comparison" })
    .click();

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
  await expect.poll(() => backend.chartRequests()).toContainEqual({
    range: "3m",
    symbols: ["CBA.AX", "BHP.AX"],
  });

  await watchlist.addCompany("wesfarmers", "WES.AX");
  await expect(page.getByText("WES.AX was added to your watchlist.")).toBeVisible();
  await expect(page.getByText("WES.AX was added to your watchlist.")).toBeHidden({
    timeout: 6_000,
  });
});
