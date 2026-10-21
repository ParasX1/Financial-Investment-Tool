import { expect, test } from "@playwright/test";
import { installWatchlistMockBackend } from "../watchlist/watchlistMockBackend";

// Isolated presentation fixtures; no live account or market requests.
test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin ===
        new URL(test.info().project.use.baseURL as string).origin &&
      !url.pathname.startsWith("/api/")
    )
      return route.continue();
    if (url.origin === "https://watchlist-e2e.supabase.co")
      return route.fulfill({
        json: [],
        headers: { "access-control-allow-origin": "*" },
      });
    return route.abort();
  });
  await installWatchlistMockBackend(page);
});

for (const width of [1920, 2560, 3440, 390, 320]) {
  test(`fluid workspace uses available width at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/Watchlist");
    await expect(
      page.getByRole("heading", { name: "Watchlist", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit CBA.AX research note" }),
    ).toBeVisible();
    for (const expanded of [false, true]) {
      const toggle = page.getByRole("button", {
        name: expanded ? "Expand navigation" : "Collapse navigation",
        exact: true,
      });
      if (await toggle.count()) await toggle.click();
      else await page.mouse.move(expanded ? 20 : width - 20, 300);
      if (width >= 768) {
        await expect
          .poll(() =>
            page
              .locator("main")
              .evaluate((el) =>
                parseFloat(getComputedStyle(el).paddingInlineStart),
              ),
          )
          .toBe(expanded ? 232 : 64);
      }
      await expect
        .poll(async () =>
          page
            .locator("main > div")
            .first()
            .evaluate((el) => {
              const main = el.parentElement!;
              return Math.abs(
                el.getBoundingClientRect().width -
                  (main.getBoundingClientRect().width -
                    parseFloat(getComputedStyle(main).paddingInlineStart)),
              );
            }),
        )
        .toBeLessThan(2);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const gutter = await page
        .locator("main > div")
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).paddingInlineStart));
      if (width < 768) expect(gutter).toBe(12);
      else {
        expect(gutter).toBeGreaterThanOrEqual(16);
        expect(gutter).toBeLessThanOrEqual(34);
      }
      await testInfo.attach(`width-${expanded ? "expanded" : "collapsed"}`, {
        body: JSON.stringify(
          await page
            .locator("main > div")
            .first()
            .evaluate((el) => ({
              viewport: innerWidth,
              contentWidth: el.getBoundingClientRect().width,
              contentX: el.getBoundingClientRect().x,
              gutter: parseFloat(getComputedStyle(el).paddingInlineStart),
              navigation: parseFloat(
                getComputedStyle(el.parentElement!).paddingInlineStart,
              ),
            })),
        ),
        contentType: "application/json",
      });
      if (width < 768 && expanded) {
        await page
          .getByRole("button", { name: "Collapse navigation", exact: true })
          .click();
      }
      const field = page.getByRole("combobox", { name: "Company or ticker" });
      await field.scrollIntoViewIfNeeded();
      await expect(field).toBeVisible();
      await field.fill("wes");
      await expect(page.getByRole("option", { name: /WES.AX/ })).toBeVisible();
      await field.fill("");
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    if (width < 768) await page.setViewportSize({ width, height: 480 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Edit CBA.AX research note" }),
    ).toBeVisible();
    if (width < 768) {
      const news = page.getByRole("link", { name: "View Watchlist News" });
      await news.scrollIntoViewIfNeeded();
      const bounds = await news.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(52);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(
        await news.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await news.focus();
      await expect(news).toBeFocused();
      await page.screenshot({
        path: testInfo.outputPath("enlarged-text-short.png"),
      });
    }
  });
}
