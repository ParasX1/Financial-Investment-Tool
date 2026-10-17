import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin === new URL(test.info().project.use.baseURL as string).origin
    )
      return route.continue();
    return route.abort();
  });
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 1440, height: 1080 },
  { width: 3440, height: 1080 },
]) {
  test(`keeps the workspace and source-order keyboard path usable at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Your portfolio. A clearer perspective.",
      }),
    ).toBeVisible();
    const start = page
      .locator("#top")
      .getByRole("button", { name: "Get started", exact: true });
    await expect(start).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    await expect(start).toBeInViewport({ ratio: 1 });
    const product = page.locator("#product");
    await expect(page.locator("#top")).toContainText(
      "Explore returns and risk, keep an eye on companies, and put market news in context.",
    );
    if (viewport.width >= 1440) {
      const content = await product.boundingBox();
      const main = await page.locator("main").boundingBox();
      expect(content!.width).toBeGreaterThan(main!.width * 0.84);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator("[tabindex]")
        .evaluateAll(
          (items) =>
            items.filter((item) => Number(item.getAttribute("tabindex")) > 0)
              .length,
        ),
    ).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("first-fold.png") });

    const expected = await page.evaluate(() => {
      const elements = Array.from(
        document
          .querySelector("main")!
          .parentElement!.querySelectorAll("a[href], button:not([disabled])"),
      );
      return elements
        .filter(
          (el) => el.getClientRects().length && !el.closest('[role="dialog"]'),
        )
        .map((el) => ({
          label: el.getAttribute("aria-label") || el.textContent?.trim(),
          inMain: Boolean(el.closest("main")),
        }));
    });
    const sequence = [];
    let previousMainTop: number | undefined;
    for (const item of expected) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        return {
          label: el.getAttribute("aria-label") || el.textContent?.trim(),
          top: el.getBoundingClientRect().top + scrollY,
          inMain: Boolean(el.closest("main")),
          outline: getComputedStyle(el).outlineStyle,
        };
      });
      expect(focused.label).toBe(item.label);
      expect(focused.outline).not.toBe("none");
      if (focused.inMain) {
        if (previousMainTop !== undefined)
          expect(focused.top - previousMainTop).toBeGreaterThanOrEqual(-50);
        previousMainTop = focused.top;
      }
      sequence.push(focused);
    }
    await testInfo.attach("native-focus-sequence", {
      body: JSON.stringify(sequence, null, 2),
      contentType: "application/json",
    });
    for (const action of [
      "Explore portfolio",
      "Explore top picks",
      "Open watchlist",
      "Read market news",
      "Explore community",
    ]) {
      const opener = product.getByRole("button", {
        name: `${action}, sign in required`,
        exact: true,
      });
      await opener.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog");
      await expect(dialog).toHaveAccessibleName("Welcome back");
      await expect(dialog.getByLabel("Email address")).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(opener).toBeFocused();
    }
  });
}
