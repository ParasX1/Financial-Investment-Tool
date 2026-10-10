import { expect, test } from "@playwright/test";
import { installMarketNewsMockBackend } from "./marketNewsMockBackend";

test.beforeEach(async ({ page }) => {
  await installMarketNewsMockBackend(page);
});

test("navigates the investor-first categories and preserves shareable topic URLs", async ({
  page,
}) => {
  await page.goto("/MarketNews");

  await expect(
    page.getByRole("heading", { level: 1, name: "Market News" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Top Stories" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { exact: true, name: "Markets" }).click();
  await expect(page).toHaveURL(/topic=australian-markets/);
  await expect(
    page.getByRole("button", { exact: true, name: "Companies & Earnings" }),
  ).toBeVisible();

  await page
    .getByRole("button", { exact: true, name: "Companies & Earnings" })
    .click();
  await expect(page).toHaveURL(/topic=companies-earnings/);
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Companies & Earnings",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      exact: true,
      name: "Read source article in a new tab: Companies & Earnings story 1",
    }),
  ).toBeVisible();
});

test("opens broad Money and Economy & Work overviews before narrower topics", async ({
  page,
}) => {
  await page.goto("/MarketNews");

  await page.getByRole("button", { exact: true, name: "Money" }).click();
  await expect(page).toHaveURL(/topic=money/);
  await expect(
    page.getByRole("heading", { level: 2, name: "Money Overview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Money Overview" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page
    .getByRole("button", { exact: true, name: "Economy & Work" })
    .click();
  await expect(page).toHaveURL(/topic=economy-work/);
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Economy & Work Overview",
    }),
  ).toBeVisible();
});

test("paginates Cost of Living stories and explains external-link behavior", async ({
  page,
}) => {
  const marketNewsRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/news/market?")) {
      marketNewsRequests.push(request.url());
    }
  });
  await page.goto("/MarketNews?topic=cost-of-living");

  await expect(page.getByText("1-12 shown")).toBeVisible();
  const firstStoryLink = page.getByRole("link", {
    exact: true,
    name: "Read source article in a new tab: Cost of Living story 1",
  });
  await expect(firstStoryLink).toBeVisible();
  await expect(firstStoryLink).toHaveAttribute("target", "_blank");
  const requestCountAfterSnapshot = marketNewsRequests.length;

  await page.getByRole("button", { name: "Next page" }).click();

  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("13-24 shown")).toBeVisible();
  await expect(
    page.getByRole("link", {
      exact: true,
      name: "Read source article in a new tab: Cost of Living story 13",
    }),
  ).toBeVisible();
  await expect(firstStoryLink).toHaveCount(0);

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page).toHaveURL(/page=3/);
  await expect(page.getByText("25-36 shown")).toBeVisible();
  await expect(
    page.getByRole("link", {
      exact: true,
      name: "Read source article in a new tab: Cost of Living story 25",
    }),
  ).toBeVisible();
  expect(marketNewsRequests).toHaveLength(requestCountAfterSnapshot);
});

test("loads older stories after the local snapshot and reaches an honest end", async ({
  page,
}) => {
  const marketNewsRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/news/market?")) {
      marketNewsRequests.push(request.url());
    }
  });

  await page.goto("/MarketNews?topic=cost-of-living&page=6");
  await expect(page.getByText("61-72 shown")).toBeVisible();
  const requestCountAfterSnapshot = marketNewsRequests.length;

  await page.getByRole("button", { name: "Load older stories" }).click();

  await expect(page).toHaveURL(/page=7/);
  await expect(page.getByText("73-84 shown")).toBeVisible();
  await expect(
    page.getByRole("link", {
      exact: true,
      name: "Read source article in a new tab: Cost of Living story 73",
    }),
  ).toBeVisible();
  expect(marketNewsRequests).toHaveLength(requestCountAfterSnapshot + 1);
  expect(new URL(marketNewsRequests.at(-1)!).searchParams.get("cursor")).toBe(
    "cursor-1",
  );

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page).toHaveURL(/page=8/);
  await expect(page.getByText("85-96 shown")).toBeVisible();
  await expect(
    page.getByRole("link", {
      exact: true,
      name: "Read source article in a new tab: Cost of Living story 85",
    }),
  ).toBeVisible();
  expect(marketNewsRequests).toHaveLength(requestCountAfterSnapshot + 1);
  await expect(
    page.getByRole("button", { name: "No older stories" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "No more stories are available from the current providers for this topic.",
    ),
  ).toBeVisible();
});

test("skips duplicate-only continuation batches before opening the next page", async ({
  page,
}) => {
  const continuationCursors: string[] = [];
  page.on("request", (request) => {
    if (!request.url().includes("/api/news/market?")) return;

    const cursor = new URL(request.url()).searchParams.get("cursor");
    if (cursor) continuationCursors.push(cursor);
  });

  await page.goto("/MarketNews?topic=property-news&page=6");
  await expect(page.getByText("61-72 shown")).toBeVisible();

  await page.getByRole("button", { name: "Load older stories" }).click();

  await expect(page).toHaveURL(/page=7/);
  await expect(
    page.getByRole("link", {
      exact: true,
      name: "Read source article in a new tab: Property & Housing story 73",
    }),
  ).toBeVisible();
  expect(continuationCursors).toEqual(["cursor-1", "cursor-2"]);
});

test("keeps category and story controls usable on a narrow mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/MarketNews?topic=cost-of-living");

  await expect(
    page.getByRole("button", { exact: true, name: "Cost of Living" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Next page" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("can leave Market News after a non-empty feed has loaded", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto("/MarketNews");
  await expect(page.getByText("1-12 shown")).toBeVisible();
  await expect(
    page.getByRole("link", {
      exact: true,
      name: "Read source article in a new tab: Top Stories story 1",
    }),
  ).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

  await page.getByRole("link", { exact: true, name: "Help" }).click();

  await expect(page).toHaveURL("/Help");
  await expect(
    page.getByRole("heading", { level: 1, name: "Help Center" }),
  ).toBeVisible();
  expect(
    runtimeErrors.filter((message) =>
      message.includes("Maximum update depth exceeded"),
    ),
  ).toEqual([]);
});
