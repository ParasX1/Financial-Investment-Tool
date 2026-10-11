import { expect, test } from "@playwright/test";
import { installWatchlistMockBackend } from "../watchlist/watchlistMockBackend";

const postTitle = "Research discussion for layout verification";

test.beforeEach(async ({ page }) => {
  await installWatchlistMockBackend(page);
  await page.route("**/rest/v1/posts?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "33333333-3333-4333-8333-333333333333",
          title: postTitle,
          body: "Synthetic research notes with a long company name and a question to revisit after the next result.",
          author_id: "31313131-3131-4131-8131-313131313131",
          tags: ["Earnings"],
          post_type: "discussion",
          post_tickers: ["CBA.AX"],
          image_url: null,
          image_path: null,
          votes: 4,
          created_at: "2026-10-09T00:00:00Z",
        },
      ]),
    }),
  );
  for (const table of ["comments", "post_likes", "post_saves"]) {
    await page.route(`**/rest/v1/${table}?**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      }),
    );
  }
});

for (const width of [1440, 390, 320]) {
  test(`keeps Community reading and navigation usable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/Community");
    await expect(
      page.getByRole("heading", { level: 1, name: "Community", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: postTitle })).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("#community-main")).toHaveAttribute(
      "tabindex",
      "-1",
    );
    await expect(page.locator("[data-community-toolbar]")).toHaveCSS(
      "position",
      "static",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

    if (width < 1024) {
      await page
        .getByRole("button", {
          name: "Expand community navigation",
          exact: true,
        })
        .click();
      const navigation = page.getByRole("dialog", {
        name: "Community navigation",
      });
      await expect(navigation).toBeVisible();
      await navigation
        .getByRole("button", { name: "New: Latest discussions first" })
        .click();
      await expect(page).toHaveURL(/view=new/);
      await navigation
        .getByRole("button", {
          name: "Collapse community navigation",
          exact: true,
        })
        .click();
      await expect(navigation).toHaveCount(0);
      await expect(
        page.getByRole("button", {
          name: "Expand community navigation",
          exact: true,
        }),
      ).toBeFocused();
    }

    const search = page.getByRole("searchbox", { name: "Search discussions" });
    await search.fill("No matching research");
    await expect(
      page.getByText("No discussions match your search.", { exact: true }),
    ).toBeVisible();
    await search.fill("");
    await expect(page.getByRole("heading", { name: postTitle })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`community-${width}.png`),
      fullPage: true,
    });
  });
}

test("keeps report controls reachable in a short mobile viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto("/Community");
  await page
    .getByRole("button", { name: "Report discussion", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Report this discussion" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(480);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("community-short-mobile.png"),
  });
});
