import { expect, test, type Page } from "@playwright/test";

const preparePortfolio = async (page: Page, dense = false) => {
  await page.route("http://127.0.0.1:8080/api/metrics/**", async (route) => {
    const url = route.request().url();
    const payload = url.includes("efficientfrontiervisualization")
      ? {
          returns: Array.from(
            { length: dense ? 1000 : 2 },
            (_, i) => 0.1 + i / 10000,
          ),
          risks: Array.from(
            { length: dense ? 1000 : 2 },
            (_, i) => 0.2 + i / 10000,
          ),
          sharpe_ratios: Array.from({ length: dense ? 1000 : 2 }, () => 0.5),
          asset_order: ["AAPL", "MSFT"],
          weights: Array.from({ length: dense ? 1000 : 2 }, () => [null, 0.8]),
        }
      : url.includes("cumulativereturncomparison") ||
          url.includes("maxdrawdownanalysis")
        ? {
            AAPL: { "2026-01-01": 0.1, "2026-01-03": 0.3 },
            MSFT: { "2026-01-02": 0.2, "2026-01-03": 0.4 },
          }
        : url.includes("marketcorrelationanalysis")
          ? { AAPL: { AAPL: 1, MSFT: 0.3 }, MSFT: { AAPL: 0.3, MSFT: 1 } }
          : { AAPL: 0.2, MSFT: 0.3 };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/Portfolio");
  const input = page.locator("input#portfolio-stock-select");
  for (const symbol of ["AAPL", "MSFT"]) {
    await input.fill(symbol);
    await input.press("Enter");
  }
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.locator("circle.portfolio-point").first()).toBeVisible();
};

test("pointer comparison uses actual selected-date observations and preserves missingness", async ({
  page,
}) => {
  await preparePortfolio(page);
  await page.getByRole("button", { name: "Focus Cumulative return" }).click();
  const overlay = page.locator("rect.hover-overlay");
  const box = await overlay.boundingBox();
  if (!box) throw new Error("Historical plot is not measurable");
  // Jan 1 is 0.025 days inside the padded 2.1-day domain.
  await page.mouse.move(box.x + box.width / 42, box.y + box.height / 2);
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("2026-01-01");
  await expect(tooltip).toContainText("AAPL: +10%");
  await expect(tooltip).toContainText("MSFT: N/A");
  await expect(page.locator(".hover-dots circle")).toHaveCount(1);
  await page.screenshot({
    path: test.info().outputPath("dated-comparison.png"),
  });
});

test("historical dates can be inspected and dismissed from one keyboard control", async ({
  page,
}) => {
  await preparePortfolio(page);
  await page.getByRole("button", { name: "Focus Cumulative return" }).click();
  const inspector = page.getByRole("slider", {
    name: /Inspect Cumulative return/,
  });
  await inspector.focus();
  await inspector.press("Home");
  await expect(inspector).toHaveAttribute(
    "aria-valuetext",
    /2026-01-01.*MSFT: N\/A/,
  );
  await inspector.press("ArrowRight");
  await expect(inspector).toHaveAttribute(
    "aria-valuetext",
    /2026-01-02.*AAPL: N\/A.*MSFT: \+20%/,
  );
  await inspector.press("End");
  await expect(inspector).toHaveAttribute(
    "aria-valuetext",
    /2026-01-03.*AAPL: \+30%.*MSFT: \+40%/,
  );
  await inspector.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Focus mode" })).toBeVisible();
  await inspector.press("ArrowLeft");
  await expect(page.getByRole("tooltip")).toBeVisible();
  await inspector.press("Tab");
  await expect(inspector).not.toBeFocused();
});

test("frontier keyboard navigation has one tab stop and retains aligned allocation slots", async ({
  page,
}) => {
  await preparePortfolio(page, true);
  const card = page.locator(
    'section[data-metric="EfficientFrontierVisualization"]',
  );
  const points = card.locator("circle.portfolio-point");
  await expect(points).toHaveCount(900);
  await expect(
    card.locator('circle.portfolio-point[tabindex="0"]'),
  ).toHaveCount(1);
  await points.first().focus();
  // Lowest-risk highlight is above this point, so the focus ring extends past it.
  await expect(points.first()).toHaveAttribute("r", "8");
  await expect(card.getByRole("tooltip")).toContainText("Risk:");
  await card.screenshot({
    path: test.info().outputPath("highlighted-point-focus.png"),
  });
  await points.first().press("ArrowRight");
  await expect(points.nth(1)).toBeFocused();
  await points.nth(1).press("End");
  await expect(points.last()).toBeFocused();
  await points.last().press("Enter");
  await expect(card.getByRole("status")).toContainText("AAPL N/A");
  await expect(card.getByRole("status")).toContainText("MSFT 80.0%");
  await expect(card.getByRole("status")).not.toContainText("AAPL 80.0%");
  await points.last().press("Tab");
  await expect(points.last()).not.toBeFocused();
  await expect(card.getByRole("tooltip")).toHaveCount(0);
});
