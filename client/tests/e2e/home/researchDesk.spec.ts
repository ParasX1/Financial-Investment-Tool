import { expect, test, type Page } from "@playwright/test";

const title = "Compare companies across return and risk.";
const metrics = [
  {
    id: "return",
    label: "Cumulative return",
    action: "Inspect return",
    values: ["4.59%", "5.09%"],
    rows: 20,
  },
  {
    id: "volatility",
    label: "Annualised volatility",
    action: "Inspect volatility",
    values: ["21.6%", "17.21%"],
    rows: 1,
  },
  {
    id: "drawdown",
    label: "Drawdown history",
    action: "Inspect drawdown",
    values: ["2.9%", "2.43%"],
    rows: 20,
  },
] as const;

async function assertNoDocumentOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

for (const width of [320, 1440]) {
  test(`shows a coherent historical comparison at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const desk = page.getByRole("figure", { name: title, exact: true });
    await expect(desk).toContainText("Historical sample");
    await expect(desk).toContainText("Apple");
    await expect(desk).toContainText("Microsoft");
    await expect(desk).toContainText("2024");
    await expect(
      desk
        .getByRole("navigation", { name: "Sample measures" })
        .getByRole("link"),
    ).toHaveCount(3);
    for (const metric of metrics) {
      const card = desk.locator(`[data-research-metric="${metric.id}"]`);
      await expect(
        card.getByRole("heading", { name: metric.label, exact: true }),
      ).toBeVisible();
      for (const value of metric.values)
        await expect(
          card.getByRole("definition").filter({ hasText: value }),
        ).toBeVisible();
      await expect(
        card.locator("[data-research-chart] svg path").first(),
      ).toBeVisible();
      await expect(
        card.getByRole("button", { name: metric.action, exact: true }),
      ).toBeEnabled();
    }
    await assertNoDocumentOverflow(page);
  });
}

test("inspects every metric by keyboard and restores its opener", async ({
  page,
}) => {
  await page.goto("/");
  const desk = page.getByRole("figure", { name: title, exact: true });
  for (const metric of metrics) {
    const opener = desk.getByRole("button", {
      name: metric.action,
      exact: true,
    });
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: metric.label, exact: true }),
    ).toBeVisible();
    await expect(dialog).toContainText("AAPL");
    await expect(dialog).toContainText("MSFT");
    await expect(dialog).toContainText("2024");
    const close = dialog.getByRole("button", { name: /Close/ }).first();
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  }
});

for (const width of [320, 1440]) {
  test(`keeps expanded metric data usable with enlarged text at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (width === 320)
      await page.route("**/fonts/geist/**", (route) => route.abort());
    await page.goto("/");
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    const desk = page.getByRole("figure", { name: title, exact: true });
    for (const metric of metrics) {
      const opener = desk.getByRole("button", {
        name: metric.action,
        exact: true,
      });
      await opener.click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("summary").click();
      const table = dialog.getByRole("table", {
        name: `${metric.label} sample data`,
        exact: true,
      });
      await expect(table.locator("tbody tr")).toHaveCount(metric.rows);
      const lastCell = table.locator("tbody tr").last().locator("td").last();
      await lastCell.scrollIntoViewIfNeeded();
      await expect(lastCell).toBeInViewport();
      await expect(
        dialog.getByRole("region", { name: `${metric.label} data table` }),
      ).toBeVisible();
      await assertNoDocumentOverflow(page);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(opener).toBeFocused();
    }
  });
}

test("retains native date inspection in the shared return chart", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.locator('[data-research-metric="return"]');
  const control = card.getByRole("slider");
  await expect(control).toBeVisible();
  await control.focus();
  await page.keyboard.press("End");
  await expect(control).toHaveAttribute("aria-valuenow", "19");
  await expect(control).toHaveAttribute("aria-valuetext", /2024-09-30/);
  await expect(control).toHaveAttribute("aria-valuetext", /AAPL/);
  await expect(control).toHaveAttribute("aria-valuetext", /MSFT/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test.describe("Research desk without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("keeps figures, methods and daily data available", async ({ page }) => {
    await page.goto("/");
    const desk = page.getByRole("figure", { name: title, exact: true });
    for (const metric of metrics) {
      const card = desk.locator(`[data-research-metric="${metric.id}"]`);
      await expect(
        card.getByRole("button", { name: metric.action, exact: true }),
      ).toBeDisabled();
      for (const value of metric.values)
        await expect(
          card.getByRole("definition").filter({ hasText: value }),
        ).toBeVisible();
      await card.locator("summary").click();
      const table = card.getByRole("table", {
        name: `${metric.label} sample data`,
        exact: true,
      });
      await expect(table.locator("tbody tr")).toHaveCount(metric.rows);
    }
  });
});
