import { expect, test } from "@playwright/test";
import { installWatchlistMockBackend } from "../watchlist/watchlistMockBackend";
const postTitle =
  "A deliberately long research discussion title about interpreting company fundamentals and market evidence";
test.beforeEach(async ({ page, baseURL }) => {
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (
      u.origin === new URL(baseURL!).origin &&
      !u.pathname.startsWith("/api/")
    )
      return route.continue();
    if (u.origin === "https://watchlist-e2e.supabase.co")
      return route.fulfill({
        json: [],
        headers: { "access-control-allow-origin": "*" },
      });
    return route.abort();
  });
  await installWatchlistMockBackend(page);
  await page.route("**/rest/v1/posts?**", (route) =>
    route.fulfill({
      json: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          title: postTitle,
          body: "Synthetic research notes for enlarged text and header verification.",
          author_id: "31313131-3131-4131-8131-313131313131",
          tags: ["Earnings"],
          post_type: "discussion",
          post_tickers: ["CBA.AX"],
          image_url: null,
          image_path: null,
          votes: 4,
          created_at: "2026-10-09T00:00:00Z",
        },
      ],
    }),
  );
  for (const table of ["comments", "post_likes", "post_saves"])
    await page.route(`**/rest/v1/${table}?**`, (route) =>
      route.fulfill({ json: [] }),
    );
});
for (const path of ["/Community", "/Guide", "/Watchlist"])
  for (const width of [320, 390]) {
    test(`${path} header reflows with enlarged text at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 480 });
      await page.goto(path);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: path.slice(1),
          exact: true,
        }),
      ).toBeVisible();
      if (path === "/Community")
        await expect(
          page.getByRole("heading", { name: postTitle, exact: true }),
        ).toBeVisible();
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "200%"),
      );
      const header = page.locator("main header").first();
      const dimensions = await header.evaluate((el) => {
        const box = el.getBoundingClientRect(),
          copy = el.querySelector(":scope > div")!,
          title = el.querySelector("h1")!,
          subtitle = el.querySelector(":scope > div > p:last-child")!;
        return {
          width: box.width,
          copy: copy.getBoundingClientRect().width,
          title: title.getBoundingClientRect().width,
          subtitle: subtitle.getBoundingClientRect().width,
          page: document.documentElement.scrollWidth,
          viewport: innerWidth,
        };
      });
      await testInfo.attach("header-dimensions", {
        body: JSON.stringify(dimensions),
        contentType: "application/json",
      });
      expect(dimensions.copy).toBeLessThanOrEqual(dimensions.width + 1);
      expect(dimensions.title).toBeLessThanOrEqual(dimensions.width + 1);
      expect(dimensions.subtitle).toBeLessThanOrEqual(dimensions.width + 1);
      expect(dimensions.page).toBeLessThanOrEqual(width);
      if (path === "/Watchlist") {
        const link = page.getByRole("link", { name: "View Watchlist News" });
        await link.focus();
        await expect(link).toBeFocused();
        expect(
          await link.evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
      }
      await header.scrollIntoViewIfNeeded();
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await page.screenshot({
        path: testInfo.outputPath("enlarged-header.png"),
      });
    });
  }
