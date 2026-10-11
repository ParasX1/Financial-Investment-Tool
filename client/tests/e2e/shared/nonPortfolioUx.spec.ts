import { expect, test, type Locator, type Page } from "@playwright/test";
import { installTopPicksMockBackend } from "../top-picks/topPicksMockBackend";
import { installWatchlistMockBackend } from "../watchlist/watchlistMockBackend";

// All provider and API responses in these presentation journeys are synthetic.
async function isolateRequests(page: Page, baseURL: string) {
  const appOrigin = new URL(baseURL).origin;
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === appOrigin
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
}

async function horizontalGeometry(locator: Locator, leadingText = false) {
  return locator.evaluate((element, inspectLeadingText) => {
    let bounds = element.getBoundingClientRect();
    if (inspectLeadingText) {
      const text = document
        .createTreeWalker(element, NodeFilter.SHOW_TEXT)
        .nextNode();
      if (!text) throw new Error("Expected a preview text node");
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, Math.min(2, text.textContent!.length));
      bounds = range.getBoundingClientRect();
    }
    const clippingAncestors = [];
    for (
      let ancestor = element.parentElement;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      const overflowX = getComputedStyle(ancestor).overflowX;
      if (!["hidden", "clip", "auto", "scroll"].includes(overflowX)) continue;
      const clip = ancestor.getBoundingClientRect();
      clippingAncestors.push({
        left: clip.left + ancestor.clientLeft,
        right: clip.left + ancestor.clientLeft + ancestor.clientWidth,
        scrollLeft: ancestor.scrollLeft,
        overflowX,
      });
    }
    return { left: bounds.left, right: bounds.right, clippingAncestors };
  }, leadingText);
}

test("Community keeps full mode labels and the start of a preview readable at 320px", async ({
  page,
  baseURL,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await isolateRequests(page, baseURL!);
  await installTopPicksMockBackend(page);
  await installWatchlistMockBackend(page);
  await page.goto("/CommunityCreate");
  await page
    .getByLabel("Discussion title", { exact: true })
    .fill("Theme draft");
  const body = page.getByLabel("Discussion body", { exact: true });
  await body.fill("A **readable** preview");
  const write = page.getByRole("button", { name: "Write", exact: true });
  const previewButton = page.getByRole("button", {
    name: "Preview",
    exact: true,
  });
  await previewButton.click();
  const preview = page.getByLabel("Markdown preview", { exact: true });
  await expect(preview).toHaveText("A readable preview");
  const measurements = {
    write: await horizontalGeometry(write),
    previewButton: await horizontalGeometry(previewButton),
    count: await horizontalGeometry(
      page.getByLabel("Post body character count", { exact: true }),
    ),
    leadingPreviewText: await horizontalGeometry(preview, true),
  };
  await testInfo.attach("editor-geometry", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
  await page.screenshot({
    path: testInfo.outputPath("community-preview.png"),
    fullPage: true,
  });
  for (const geometry of Object.values(measurements)) {
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(320);
    for (const ancestor of geometry.clippingAncestors) {
      expect(ancestor.scrollLeft).toBe(0);
      expect(geometry.left).toBeGreaterThanOrEqual(ancestor.left - 1);
      expect(geometry.right).toBeLessThanOrEqual(ancestor.right + 1);
    }
  }
  await write.click();
  await expect(body).toHaveValue("A **readable** preview");
  await body.fill("a".repeat(40_000));
  await expect(
    page.getByLabel("Post body character count", { exact: true }),
  ).toHaveText("40,000/40,000");
  const maxCount = await horizontalGeometry(
    page.getByLabel("Post body character count", { exact: true }),
  );
  for (const ancestor of maxCount.clippingAncestors) {
    expect(ancestor.scrollLeft).toBe(0);
    expect(maxCount.left).toBeGreaterThanOrEqual(ancestor.left - 1);
    expect(maxCount.right).toBeLessThanOrEqual(ancestor.right + 1);
  }
});

for (const rowCount of [25, 100]) {
  test(`Top Picks exposes a failed refresh and Retry above ${rowCount} retained rows`, async ({
    page,
    baseURL,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await isolateRequests(page, baseURL!);
    const backend = await installTopPicksMockBackend(page, {
      persistentEvents: true,
    });
    let failRefresh = false;
    const rows = Array.from({ length: rowCount }, (_, index) => ({
      symbol: `FIXTURE${index + 1}.AX`,
      name: `Fixture company ${index + 1}`,
      industry: "Diversified",
      ret1y: 0.1,
      sharpe: 1,
    }));
    const errorText = "Refresh temporarily unavailable";
    await page.route("**/api/top-picks", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      if (failRefresh) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({ error: errorText }),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          data: {
            rows: rows.slice(0, route.request().postDataJSON().page_size),
            total: rowCount,
          },
          metadata: { generatedAt: "2026-07-30T06:00:00Z" },
          warnings: [],
        }),
      });
    });

    try {
      await page.goto("/TopPicks");
      await expect(page.locator("tbody tr")).toHaveCount(25);
      if (rowCount === 100) {
        await page
          .getByRole("combobox", { name: "Top Picks rows per page" })
          .click();
        await page.getByRole("option", { name: "100", exact: true }).click();
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      await expect(page.locator("tbody tr")).toHaveCount(rowCount);
      await expect.poll(() => backend.activeEventWindows()).toEqual(["1Y"]);
      const priorRows = await page.locator("tbody").innerText();
      const updated = await page.getByText(/^Updated /).innerText();
      failRefresh = true;
      backend.completeRefresh();
      const alert = page.getByRole("alert").filter({ hasText: errorText });
      await expect(alert).toBeVisible();
      const retry = page.getByRole("button", {
        name: "Retry loading Top Picks",
      });
      await expect(retry).toBeVisible();
      await expect(page.locator("tbody")).toHaveText(priorRows, {
        useInnerText: true,
      });
      await expect(page.getByText(/^Updated /)).toHaveText(updated);
      await expect(
        page.getByRole("button", { name: "Export page CSV" }),
      ).toBeEnabled();
      const geometry = {
        alert: await alert.boundingBox(),
        retry: await retry.boundingBox(),
        table: await page
          .getByRole("table", { name: "Top Picks rankings" })
          .boundingBox(),
        scrollY: await page.evaluate(() => window.scrollY),
      };
      await testInfo.attach("refresh-geometry", {
        body: JSON.stringify(geometry, null, 2),
        contentType: "application/json",
      });
      await page.screenshot({
        path: testInfo.outputPath("top-picks-refresh.png"),
      });
      expect(geometry.scrollY).toBe(0);
      for (const bounds of [geometry.alert, geometry.retry]) {
        expect(bounds).not.toBeNull();
        expect(bounds!.y).toBeGreaterThanOrEqual(0);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
          geometry.table!.y,
        );
      }
      await expect(alert).toContainText("Showing previous results");
      failRefresh = false;
      await retry.click();
      await expect(alert).toHaveCount(0);
      await expect(page.locator("tbody tr")).toHaveCount(rowCount);
      await expect(page.locator("tbody")).toHaveText(priorRows, {
        useInnerText: true,
      });
    } finally {
      backend.completeRefresh();
      await backend.dispose();
    }
  });
}
