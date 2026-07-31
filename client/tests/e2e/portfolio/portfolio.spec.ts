import { expect, test } from "@playwright/test";

const responseFor = (url: string) => {
  if (url.includes("cumulativereturncomparison")) {
    return {
      AAPL: { "2025-07-28": 0, "2026-07-28": 0.24 },
      MSFT: { "2025-07-28": 0, "2026-07-28": 0.18 },
    };
  }
  if (url.includes("maxdrawdownanalysis")) {
    return {
      AAPL: { "2025-07-28": 0, "2026-01-28": -0.12, "2026-07-28": -0.03 },
      MSFT: { "2025-07-28": 0, "2026-01-28": -0.08, "2026-07-28": 0 },
    };
  }
  if (url.includes("volatilityanalysis")) {
    return { AAPL: 0.28, MSFT: 0.22 };
  }
  if (url.includes("sharperatiomatrix")) {
    return { AAPL: 1.42, MSFT: 1.15 };
  }
  if (url.includes("marketcorrelationanalysis")) {
    return {
      AAPL: { AAPL: 1, MSFT: 0.44, SPY: 0.71 },
      MSFT: { AAPL: 0.44, MSFT: 1, SPY: 0.68 },
      SPY: { AAPL: 0.71, MSFT: 0.68, SPY: 1 },
    };
  }
  if (url.includes("efficientfrontiervisualization")) {
    return {
      returns: [0.1, 0.13, 0.16],
      risks: [0.17, 0.2, 0.25],
      sharpe_ratios: [0.5, 0.6, 0.58],
      asset_order: ["AAPL", "MSFT"],
      weights: [
        [0.2, 0.8],
        [0.5, 0.5],
        [0.8, 0.2],
      ],
      max_sharpe_index: 1,
      min_volatility_index: 0,
      sample_count: 3,
      sampling_method: "dirichlet",
      seed: 0,
    };
  }
  if (url.includes("valueatriskanalysis")) {
    return { AAPL: 0.041, MSFT: 0.035 };
  }
  return {};
};

const addSymbol = async (page: import("@playwright/test").Page, symbol: string) => {
  const input = page.locator("input#portfolio-stock-select");
  await input.fill(symbol);
  await input.press("Enter");
};

test("supports Board, Focus, and persistent Observation without losing the six-card deck", async ({
  page,
}) => {
  const metricRequests: string[] = [];
  await page.route("http://127.0.0.1:8080/api/metrics/**", async (route) => {
    metricRequests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseFor(route.request().url())),
    });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboardView");

  await expect(
    page.getByRole("heading", {
      name: "Scan broadly. Investigate deeply.",
    }),
  ).toBeVisible();
  await expect(page.locator("section[data-card-id]")).toHaveCount(6);
  await expect.poll(() => metricRequests.length).toBe(0);

  await addSymbol(page, "AAPL");
  await addSymbol(page, "MSFT");
  await page.getByRole("button", { name: "Run analysis" }).click();

  await expect.poll(() => metricRequests.length).toBe(6);
  await expect(page.locator("section[data-card-id]")).toHaveCount(6);
  await expect(page.getByText("6 / 6 active")).toBeVisible();

  const correlationCard = page.locator(
    'section[data-metric="MarketCorrelationAnalysis"]',
  );
  await correlationCard.locator("rect.cell").nth(1).click();
  await expect(
    correlationCard.getByRole("status").filter({ hasText: "Rolling correlation" }),
  ).toBeVisible();

  const portfolioCard = page.locator(
    'section[data-metric="EfficientFrontierVisualization"]',
  );
  await portfolioCard.locator("circle.portfolio-point").first().click();
  await expect(
    portfolioCard.getByText("Pinned sampled portfolio"),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Focus Cumulative return" })
    .click();
  await expect(page.getByRole("region", { name: "Focus mode" })).toBeVisible();
  await expect(
    page.getByText("View summary values and accessible data table"),
  ).toBeVisible();
  await expect.poll(() => metricRequests.length).toBe(6);

  await page.getByRole("button", { name: "Observation" }).click();
  await expect(
    page.getByRole("dialog", { name: "Portfolio Observation mode" }),
  ).toBeVisible();
  await expect(page.locator('[class*="observationWindow"]')).toHaveCount(6);
  await expect.poll(() => metricRequests.length).toBe(6);

  await page
    .getByRole("button", { name: "Hide Cumulative return window" })
    .click();
  await expect(page.locator('[class*="observationWindow"]')).toHaveCount(5);
  await page.getByRole("button", { name: "Auto arrange" }).click();
  await page.getByRole("button", { name: "Done" }).click();

  await expect(
    page.getByRole("region", { name: "Multi-metric Portfolio board" }),
  ).toBeVisible();
  await expect(page.locator("section[data-card-id]")).toHaveCount(6);
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator("section[data-card-id]")).toHaveCount(6);

  await page.getByRole("button", { name: "Observation" }).click();
  await expect(page.locator('[class*="observationWindow"]')).toHaveCount(5);
});

test("changes only one card and remains operable without horizontal overflow on mobile", async ({
  page,
}) => {
  const metricRequests: string[] = [];
  await page.route("http://127.0.0.1:8080/api/metrics/**", async (route) => {
    metricRequests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseFor(route.request().url())),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboardView");
  await addSymbol(page, "AAPL");
  await addSymbol(page, "MSFT");
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect.poll(() => metricRequests.length).toBe(6);

  const secondCardMetric = page
    .locator("section[data-card-id]")
    .nth(1)
    .getByRole("combobox", { name: "Metric" });
  await secondCardMetric.selectOption("ValueAtRiskAnalysis");
  await expect.poll(() => metricRequests.length).toBe(7);
  expect(metricRequests.filter((url) => url.includes("valueatriskanalysis"))).toHaveLength(1);

  await page.getByRole("button", { name: "Observation" }).click();
  await expect(page.locator('[class*="observationWindow"]')).toHaveCount(6);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
