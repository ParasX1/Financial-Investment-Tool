import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin === new URL(baseURL!).origin &&
      !url.pathname.startsWith("/api/")
    )
      return route.continue();
    return route.abort();
  });
});
for (const width of [1920, 3440, 390, 320]) {
  test(`local learning reading measure at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/Guide", "/Help"]) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: path === "/Guide" ? "Guide" : "Help Center",
          exact: true,
        }),
      ).toBeVisible();
      const prose =
        path === "/Guide"
          ? page
              .locator("section")
              .filter({
                has: page.getByRole("heading", {
                  name: "Interpretation",
                  exact: true,
                }),
              })
              .last()
              .locator(":scope > div")
              .last()
          : page.locator("article").first().locator("p");
      const dimensions = await prose.evaluate((el) => {
        const s = getComputedStyle(el),
          probe = document.createElement("span");
        probe.style.cssText =
          "position:absolute;visibility:hidden;width:70ch;font:" + s.font;
        document.body.append(probe);
        const limit = probe.getBoundingClientRect().width;
        probe.remove();
        return {
          width: el.getBoundingClientRect().width,
          limit,
          viewport: innerWidth,
        };
      });
      await testInfo.attach(path.slice(1) + "-dimensions", {
        body: JSON.stringify(dimensions),
        contentType: "application/json",
      });
      expect.soft(dimensions.width).toBeLessThanOrEqual(dimensions.limit + 1);
      const intro = page
        .getByText("Current Topic", { exact: true })
        .locator("..")
        .locator(":scope > div")
        .last();
      expect(
        await intro.evaluate((el) => {
          const probe = document.createElement("span");
          probe.style.cssText =
            "position:absolute;visibility:hidden;width:70ch;font:" +
            getComputedStyle(el).font;
          document.body.append(probe);
          const bounded =
            el.getBoundingClientRect().width <=
            probe.getBoundingClientRect().width + 1;
          probe.remove();
          return bounded;
        }),
      ).toBe(true);
      if (width >= 1920) {
        expect(
          await page
            .locator("main > div")
            .first()
            .evaluate((el) => el.getBoundingClientRect().width),
        ).toBeGreaterThan(width - 320);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (path === "/Guide") {
        const nav = page.getByRole("navigation", { name: "Guide Topics" });
        await nav.getByRole("button", { name: "Beta", exact: true }).click();
        await expect(page).toHaveURL(/section=beta/);
        await expect(
          page.getByRole("region", { name: "Beta content", exact: true }),
        ).toBeFocused();
        const formula = page.locator("code");
        await expect(formula).toBeVisible();
        await expect(formula).toHaveCSS("overflow-x", "auto");
      }
      if (width < 768) {
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "200%";
        });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (path === "/Guide") {
          const formula = page.locator("code");
          expect(
            await formula.evaluate((el) => el.scrollWidth > el.clientWidth),
          ).toBe(true);
          expect(
            await formula.evaluate((el) => {
              el.scrollLeft = 40;
              return el.scrollLeft;
            }),
          ).toBeGreaterThan(0);
          await formula.scrollIntoViewIfNeeded();
          await page.evaluate(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => resolve()),
                ),
              ),
          );
          await page.screenshot({
            path: testInfo.outputPath("formula-enlarged.png"),
          });
        }
      }
    }
  });
}
