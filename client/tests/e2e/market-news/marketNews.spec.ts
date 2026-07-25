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

test("paginates Cost of Living stories and explains external-link behavior", async ({
  page,
}) => {
  await page.goto("/MarketNews?topic=cost-of-living");

  await expect(page.getByText("1-12 shown")).toBeVisible();
  const firstStoryLink = page.getByRole("link", {
    exact: true,
    name: "Read source article in a new tab: Cost of Living story 1",
  });
  await expect(firstStoryLink).toBeVisible();
  await expect(firstStoryLink).toHaveAttribute("target", "_blank");

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
