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
        name: "Make sense of investing. One company at a time.",
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
      "Compare historical return and risk, keep your notes, and explore market news—with explanations that help the numbers make sense.",
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

    // Wait for actual chart controls before recording the native focus sequence.
    for (const metric of ["return", "volatility", "drawdown"]) {
      await expect(
        page
          .locator(
            `[data-research-metric="${metric}"] [data-research-chart] svg path`,
          )
          .first(),
      ).toBeVisible();
    }
    const expected = await page.evaluate(() => {
      const elements = Array.from(
        document
          .querySelector("main")!
          .parentElement!.querySelectorAll(
            "a[href], button, input, select, textarea, summary, [tabindex]",
          ),
      );
      return elements
        .filter((el) => {
          const control = el as HTMLElement;
          if (
            control.tabIndex < 0 ||
            control.matches(":disabled") ||
            !control.getClientRects().length ||
            control.closest('[role="dialog"]')
          )
            return false;
          for (
            let details = control.closest("details:not([open])");
            details;
            details =
              details.parentElement?.closest("details:not([open])") ?? null
          ) {
            if (!details.querySelector(":scope > summary")?.contains(control))
              return false;
          }
          return true;
        })
        .map((el) => ({
          label: el.getAttribute("aria-label") || el.textContent?.trim(),
          inMain: Boolean(el.closest("main")),
        }));
    });
    const sequence = [];
    const researchOrder: string[] = [];
    for (const item of expected) {
      await page.keyboard.press("Tab");
      await expect(page.locator(":focus")).toBeInViewport();
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        return {
          label: el.getAttribute("aria-label") || el.textContent?.trim(),
          top: el.getBoundingClientRect().top + scrollY,
          inMain: Boolean(el.closest("main")),
          outline: getComputedStyle(el).outlineStyle,
          outlineWidth: parseFloat(getComputedStyle(el).outlineWidth),
          isSvg: el instanceof SVGElement,
          stroke: getComputedStyle(el).stroke,
          strokeWidth: parseFloat(getComputedStyle(el).strokeWidth),
          metric: el
            .closest("[data-research-metric]")
            ?.getAttribute("data-research-metric"),
        };
      });
      expect(focused.label).toBe(item.label);
      if (focused.isSvg) {
        // The line inspector paints a stroke; native SVG bars use Chromium's
        // visible outline. Both are valid focus indicators, verified in view.
        const outlineVisible =
          focused.outline !== "none" && focused.outlineWidth > 0;
        const strokeVisible =
          focused.stroke !== "none" && focused.strokeWidth > 0;
        expect(outlineVisible || strokeVisible).toBe(true);
      } else {
        expect(focused.outline).not.toBe("none");
      }
      // Moving to the next card on a row legitimately moves upward. Preserve
      // native DOM order and complete each metric before entering the next.
      if (focused.metric && researchOrder.at(-1) !== focused.metric)
        researchOrder.push(focused.metric);
      sequence.push(focused);
    }
    expect(researchOrder).toEqual(["return", "volatility", "drawdown"]);
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
