import { expect, test } from "@playwright/test";

function preview(windowCode: string, symbol: string) {
  return {
    data: {
      rows: [
        {
          rank: 1,
          symbol,
          name: `${symbol} ETF`,
          category: "Equity",
          issuer: "Example",
          expenseRatio: 0.001,
          aumUsd: 2_000_000_000,
          priceReturn: 0.04,
          volatility: null,
          sharpe: null,
          maxDrawdown: null,
        },
      ],
      total: 1,
    },
    metadata: {
      windowCode,
      generatedAt: "2026-10-09T01:02:03Z",
      source: "hardcoded_preview",
      sortKey: windowCode === "1Y" ? "sharpe" : "priceReturn",
    },
    warnings: [`${symbol} window warning`],
  };
}

const headers = { "access-control-allow-origin": "*" };

test("hides the prior window during loading and failure, then retries the selected preview", async ({
  page,
}) => {
  let releaseDay!: () => void;
  const dayGate = new Promise<void>((resolve) => {
    releaseDay = resolve;
  });
  let dayRequested = false;
  let dayAttempts = 0;
  await page.route("**/api/etfs?*", async (route) => {
    const window = new URL(route.request().url()).searchParams.get("window")!;
    if (window === "1D" && ++dayAttempts === 1) {
      dayRequested = true;
      await dayGate;
      await route.fulfill({
        status: 503,
        headers,
        contentType: "application/json",
        body: "{}",
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers,
      contentType: "application/json",
      body: JSON.stringify(preview(window, window === "1Y" ? "YEAR" : "DAY")),
    });
  });

  try {
    await page.goto("/ETF");
    const main = page.getByRole("main");
    await expect(main.locator("tbody tr")).toHaveCount(1);
    await expect(main).toContainText("YEAR ETF");
    await expect(main).toContainText("YEAR window warning");
    await expect(main.getByText(/^Updated /)).toBeVisible();

    await page.getByRole("button", { name: "Day", exact: true }).click();
    await expect.poll(() => dayRequested).toBe(true);
    await expect(main).toHaveAttribute("aria-busy", "true");
    await expect(main.getByRole("status")).toContainText(
      "Loading ETF preview for Day (1D)",
    );
    await expect(main).not.toContainText("YEAR");
    await expect(main.getByText(/^Updated /)).toHaveCount(0);
    await expect(main).toContainText(
      "hardcoded preview and is not live market data",
    );

    releaseDay();
    await expect(main.getByRole("alert")).toContainText(
      "Unable to load ETF preview for Day (1D)",
    );
    await expect(main).toHaveAttribute("aria-busy", "false");
    await expect(main.locator("tbody tr")).toHaveCount(0);
    await expect(main).not.toContainText("YEAR");

    await page
      .getByRole("button", { name: "Retry loading ETF preview" })
      .click();
    await expect(main.locator("tbody tr")).toHaveCount(1);
    await expect(main).toContainText("DAY ETF");
    await expect(main).toContainText("DAY window warning");
    await expect(main.getByRole("alert")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Day", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  } finally {
    releaseDay();
  }
});

test("rejects a missing required financial metric, distinguishes empty results, and preserves real zeros", async ({
  page,
}) => {
  let attempt = 0;
  await page.route("**/api/etfs?*", async (route) => {
    const body = preview("1Y", "ZERO");
    attempt += 1;
    if (attempt === 1) {
      Reflect.deleteProperty(body.data.rows[0], "expenseRatio");
    } else if (attempt === 2) {
      body.data.rows = [];
      body.data.total = 0;
      Reflect.deleteProperty(body.metadata, "generatedAt");
    } else {
      Object.assign(body.data.rows[0], {
        expenseRatio: 0,
        aumUsd: 0,
        priceReturn: 0,
      });
    }
    await route.fulfill({
      status: 200,
      headers,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  await page.goto("/ETF");
  const main = page.getByRole("main");
  await expect(main.getByRole("alert")).toContainText(
    "Unable to load ETF preview for Year (1Y)",
  );
  await expect(main.locator("tbody tr")).toHaveCount(0);
  await expect(main).not.toContainText("ZERO ETF");

  await page.getByRole("button", { name: "Retry loading ETF preview" }).click();
  await expect(main.getByRole("status")).toHaveText(
    "No ETF preview results for Year (1Y).",
  );
  await expect(main).toContainText("Generation time unavailable");
  await expect(main.locator("tbody tr")).toHaveCount(0);

  await page.getByRole("button", { name: "Retry loading ETF preview" }).click();
  const row = main.locator("tbody tr");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("ZERO ETF");
  await expect(row.getByRole("cell").nth(5)).toHaveText("$0B");
  await expect(row.getByRole("cell").nth(6)).toHaveText("0.00%");
  await expect(row.getByRole("cell").nth(7)).toHaveText("+0.0%");
  await expect(row.getByRole("cell").nth(8)).toHaveText("-");
});
